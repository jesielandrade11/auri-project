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
    // Get authenticated user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with anon key to verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Authentication required');
    }

    console.log('✅ User authenticated:', user.id);

    const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID');
    const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET');

    console.log('🔄 Pluggy sync function started');
    console.log('Credentials present:', !!PLUGGY_CLIENT_ID, !!PLUGGY_CLIENT_SECRET);

    const { contaId } = await req.json();

    if (!contaId) {
      throw new Error('contaId is required');
    }

    console.log('🏦 Syncing account:', contaId);

    // Create service role client for RLS bypass (only after user verification)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify account ownership before syncing
    const { data: conta, error: contaError } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('id', contaId)
      .eq('user_id', user.id)
      .single();

    if (contaError || !conta) {
      console.error('❌ Account not found or access denied');
      throw new Error('Account not found or access denied');
    }

    console.log('✅ Account found:', conta.nome);
    console.log('Pluggy item ID:', conta.pluggy_item_id);
    console.log('Pluggy account ID:', conta.pluggy_account_id);

    if (!conta.pluggy_item_id) {
      throw new Error('Account not connected to Pluggy');
    }

    console.log('🔐 Authenticating with Pluggy...');

    // Get API key
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    console.log('Auth response status:', authResponse.status);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Authentication failed:', errorText);
      throw new Error(`Failed to authenticate with Pluggy: ${errorText}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('✅ Authentication successful');

    console.log('📊 Fetching accounts from Pluggy...');

    // Fetch accounts for this item
    const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${conta.pluggy_item_id}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    console.log('Accounts response status:', accountsResponse.status);

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('❌ Failed to fetch accounts:', errorText);
      throw new Error(`Failed to fetch accounts from Pluggy: ${errorText}`);
    }

    const { results: accounts } = await accountsResponse.json();
    console.log(`✅ Found ${accounts.length} accounts from Pluggy`);
    
    const pluggyAccount = accounts.find((acc: any) => acc.id === conta.pluggy_account_id);

    if (!pluggyAccount) {
      console.error('❌ Pluggy account not found. Available accounts:', accounts.map((a: any) => a.id));
      throw new Error('Pluggy account not found');
    }

    console.log('✅ Found matching Pluggy account:', pluggyAccount.id);
    console.log('Account balance:', pluggyAccount.balance);

    console.log('💳 Fetching transactions...');

    // Fetch transactions
    const transactionsResponse = await fetch(`https://api.pluggy.ai/transactions?accountId=${pluggyAccount.id}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    console.log('Transactions response status:', transactionsResponse.status);

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      console.error('❌ Failed to fetch transactions:', errorText);
      throw new Error(`Failed to fetch transactions from Pluggy: ${errorText}`);
    }

    const { results: transactions } = await transactionsResponse.json();
    console.log(`✅ Found ${transactions.length} transactions from Pluggy`);

    let imported = 0;
    let skipped = 0;

    console.log('💾 Processing transactions...');

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
        console.error('❌ Error inserting transaction:', error);
      } else {
        imported++;
      }
    }

    console.log(`📊 Processing results: ${imported} imported, ${skipped} skipped`);

    // Update account balance and last sync
    const { error: updateError } = await supabase
      .from('contas_bancarias')
      .update({ 
        saldo_atual: pluggyAccount.balance,
        ultima_sincronizacao: new Date().toISOString(),
        ultimo_erro_sync: null,
      })
      .eq('id', conta.id);

    if (updateError) {
      console.error('❌ Error updating account:', updateError);
    } else {
      console.log('✅ Account updated successfully');
    }

    console.log(`✅ Sync complete: ${imported} imported, ${skipped} skipped out of ${transactions.length} total`);

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
