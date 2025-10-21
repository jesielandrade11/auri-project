import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID');
    const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET');

    const { contaId } = await req.json();

    if (!contaId) {
      throw new Error('contaId is required');
    }

    console.log('Syncing account:', contaId);

    // Get account details
    const { data: conta, error: contaError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('id', contaId)
      .single();

    if (contaError || !conta) {
      throw new Error('Account not found');
    }

    if (!conta.pluggy_item_id) {
      throw new Error('Account not connected to Pluggy');
    }

    // Get API key
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Pluggy');
    }

    const { apiKey } = await authResponse.json();

    // Fetch accounts for this item
    const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${conta.pluggy_item_id}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts from Pluggy');
    }

    const { results: accounts } = await accountsResponse.json();
    const pluggyAccount = accounts.find((acc: any) => acc.id === conta.pluggy_account_id);

    if (!pluggyAccount) {
      throw new Error('Pluggy account not found');
    }

    // Fetch transactions
    const transactionsResponse = await fetch(`https://api.pluggy.ai/transactions?accountId=${pluggyAccount.id}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!transactionsResponse.ok) {
      throw new Error('Failed to fetch transactions from Pluggy');
    }

    const { results: transactions } = await transactionsResponse.json();
    console.log(`Found ${transactions.length} transactions`);

    let imported = 0;
    let skipped = 0;

    // Import transactions
    for (const tx of transactions) {
      // Check if transaction already exists
      const { data: existing } = await supabase
        .from('transacoes')
        .select('id')
        .eq('conta_id', conta.id)
        .eq('descricao_original', tx.description)
        .eq('data_transacao', tx.date)
        .eq('valor', Math.abs(tx.amount))
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('transacoes').insert({
        user_id: conta.user_id,
        conta_id: conta.id,
        descricao: tx.description,
        descricao_original: tx.description,
        valor: Math.abs(tx.amount),
        tipo: tx.amount >= 0 ? 'receita' : 'despesa',
        data_transacao: tx.date,
        data_competencia: tx.date,
        status: 'pago',
        origem: 'pluggy',
        arquivo_origem: `pluggy_item_${conta.pluggy_item_id}`,
      });

      if (error) {
        console.error('Error inserting transaction:', error);
      } else {
        imported++;
      }
    }

    // Update account balance and last sync
    await supabase
      .from('contas_bancarias')
      .update({ 
        saldo_atual: pluggyAccount.balance,
        ultima_sincronizacao: new Date().toISOString(),
        ultimo_erro_sync: null,
      })
      .eq('id', conta.id);

    console.log(`Sync complete: ${imported} imported, ${skipped} skipped`);

    return new Response(JSON.stringify({ 
      success: true,
      imported,
      skipped,
      total: transactions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pluggy-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to update error message on the account
    try {
      const { contaId } = await req.json();
      if (contaId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('contas_bancarias')
          .update({ ultimo_erro_sync: errorMessage })
          .eq('id', contaId);
      }
    } catch (e) {
      console.error('Error updating error message:', e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
