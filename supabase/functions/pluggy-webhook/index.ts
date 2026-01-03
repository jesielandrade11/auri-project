import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log('Webhook received:', payload);

        const { event, itemId } = payload;

        if (!event || !itemId) {
            throw new Error('Invalid webhook payload');
        }

        // Only process relevant events
        if (event !== 'TRANSACTIONS_CREATED' && event !== 'ITEM_UPDATED') {
            console.log(`Ignoring event: ${event}`);
            return new Response(JSON.stringify({ message: 'Event ignored' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Initialize Supabase Admin Client (to bypass RLS and find user)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Find the user associated with this Item ID
        const { data: account, error: accountError } = await supabase
            .from('contas_bancarias')
            .select('user_id')
            .eq('pluggy_item_id', itemId)
            .limit(1)
            .single();

        if (accountError || !account) {
            console.error('Account not found for item:', itemId);
            return new Response(JSON.stringify({ error: 'Account not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const userId = account.user_id;
        console.log(`Found user ${userId} for item ${itemId}`);

        // --- SYNC LOGIC (Duplicated from sync-transactions for independence) ---

        // Get Pluggy credentials
        const pluggyClientId = Deno.env.get('PLUGGY_CLIENT_ID');
        const pluggyClientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

        if (!pluggyClientId || !pluggyClientSecret) {
            throw new Error('Pluggy credentials not configured');
        }

        // Authenticate with Pluggy
        const authResponse = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: pluggyClientId,
                clientSecret: pluggyClientSecret,
            }),
        });

        if (!authResponse.ok) {
            throw new Error('Pluggy authentication failed');
        }

        const { apiKey } = await authResponse.json();

        // Fetch and update accounts (Update Balance)
        const accountsResponse = await fetch(
            `https://api.pluggy.ai/accounts?itemId=${itemId}`,
            {
                headers: { 'X-API-KEY': apiKey },
            }
        );

        if (accountsResponse.ok) {
            const { results: accounts } = await accountsResponse.json();
            for (const account of accounts) {
                const { error: updateError } = await supabase
                    .from('contas_bancarias')
                    .update({
                        saldo_atual: account.balance,
                        ultima_sincronizacao: new Date().toISOString(),
                        ...(account.creditData?.balanceCloseDate && {
                            closing_day: new Date(account.creditData.balanceCloseDate).getUTCDate()
                        }),
                        ...(account.creditData?.balanceDueDate && {
                            due_day: new Date(account.creditData.balanceDueDate).getUTCDate()
                        })
                    })
                    .eq('pluggy_account_id', account.id);

                if (updateError) console.error(`Error updating account ${account.id}:`, updateError);
            }
        }

        // Fetch transactions
        const transactionsResponse = await fetch(
            `https://api.pluggy.ai/transactions?itemId=${itemId}`,
            {
                headers: { 'X-API-KEY': apiKey },
            }
        );

        if (!transactionsResponse.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const { results: transactions } = await transactionsResponse.json();
        console.log(`Fetched ${transactions.length} transactions`);

        const duplicates: string[] = [];
        const inserted: string[] = [];

        // Create a map of Pluggy Account ID -> Supabase Account ID
        const accountMap = new Map<string, string>();

        // Get all unique account IDs from transactions
        const pluggyAccountIds = [...new Set(transactions.map((t: any) => t.accountId))];

        if (pluggyAccountIds.length > 0) {
            const { data: accounts } = await supabase
                .from('contas_bancarias')
                .select('id, pluggy_account_id')
                .in('pluggy_account_id', pluggyAccountIds);

            if (accounts) {
                accounts.forEach((acc: any) => {
                    if (acc.pluggy_account_id) {
                        accountMap.set(acc.pluggy_account_id, acc.id);
                    }
                });
            }
        }

        for (const transaction of transactions) {
            const pluggyId = transaction.id;

            // Check duplicate
            const { data: existing } = await supabase
                .from('transacoes')
                .select('id')
                .eq('pluggy_transaction_id', pluggyId)
                .single();

            if (existing) {
                duplicates.push(pluggyId);
                continue;
            }

            // Determine status and conciliation
            const isPosted = transaction.status === 'POSTED';
            const status = isPosted ? 'pago' : 'pendente';
            const conciliado = isPosted;

            // Determine contraparte name
            let contraparteName = transaction.description;
            if (transaction.merchant?.businessName) {
                contraparteName = transaction.merchant.businessName;
            } else if (transaction.merchant?.name) {
                contraparteName = transaction.merchant.name;
            } else if (transaction.paymentData?.receiver?.name) {
                contraparteName = transaction.paymentData.receiver.name;
            } else if (transaction.paymentData?.payer?.name) {
                contraparteName = transaction.paymentData.payer.name;
            }

            // Upsert contraparte and get ID
            let contraparteId = null;
            if (contraparteName) {
                const cleanName = contraparteName.trim();

                if (cleanName) {
                    // Check if exists
                    const { data: existingContraparte } = await supabase
                        .from('contrapartes')
                        .select('id')
                        .eq('user_id', userId)
                        .ilike('nome', cleanName)
                        .maybeSingle();

                    if (existingContraparte) {
                        contraparteId = existingContraparte.id;
                    } else {
                        // Create new
                        const role = transaction.amount >= 0 ? 'cliente' : 'fornecedor';
                        const { data: newContraparte, error: createError } = await supabase
                            .from('contrapartes')
                            .insert({
                                user_id: userId,
                                nome: cleanName,
                                papel: role,
                                ativo: true
                            })
                            .select('id')
                            .single();

                        if (!createError && newContraparte) {
                            contraparteId = newContraparte.id;
                        } else if (createError) {
                            console.error(`Error creating contraparte ${cleanName}:`, createError);
                        }
                    }
                }
            }

            // Get internal account ID
            const internalAccountId = transaction.accountId ? accountMap.get(transaction.accountId) : null;

            // Insert
            const { error: insertError } = await supabase
                .from('transacoes')
                .insert({
                    user_id: userId,
                    pluggy_transaction_id: pluggyId,
                    data_transacao: transaction.date,
                    descricao: transaction.description,
                    valor: Math.abs(transaction.amount),
                    tipo: transaction.amount >= 0 ? 'receita' : 'despesa',
                    // contraparte: contraparte, // Removed as column doesn't exist
                    contraparte_id: contraparteId, // Linked to contrapartes table
                    status: status,
                    data_baixa: isPosted ? transaction.date : null,
                    conciliado: conciliado,
                    origem: 'api',
                    conta_bancaria_id: internalAccountId, // Use mapped ID
                    categoria_id: null, // We don't have category mapping yet, keeping null
                });

            if (insertError) {
                console.error(`Error inserting transaction ${pluggyId}:`, insertError);
            } else {
                inserted.push(pluggyId);
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Webhook processed',
                summary: {
                    total: transactions.length,
                    inserted: inserted.length,
                    duplicates: duplicates.length,
                },
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
