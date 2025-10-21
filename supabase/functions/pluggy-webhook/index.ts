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

    const event = await req.json();
    console.log('Pluggy webhook event received:', event);

    // Get API key
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    const { apiKey } = await authResponse.json();

    // Handle different event types
    if (event.event === 'item/created' || event.event === 'item/updated') {
      const itemId = event.data.id;
      
      // Fetch accounts for this item
      const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      
      const { results: accounts } = await accountsResponse.json();
      console.log(`Found ${accounts.length} accounts for item ${itemId}`);

      // Fetch transactions
      const transactionsResponse = await fetch(`https://api.pluggy.ai/transactions?accountId=${accounts[0]?.id}`, {
        headers: { 'X-API-KEY': apiKey },
      });

      const { results: transactions } = await transactionsResponse.json();
      console.log(`Found ${transactions.length} transactions`);

      // Find the conta_bancaria linked to this Pluggy item
      const { data: conta } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('pluggy_item_id', itemId)
        .single();

      if (conta) {
        // Import transactions
        for (const tx of transactions) {
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
            arquivo_origem: `pluggy_item_${itemId}`,
          });

          if (error) {
            console.error('Error inserting transaction:', error);
          }
        }

        // Update account balance
        await supabase
          .from('contas_bancarias')
          .update({ 
            saldo_atual: accounts[0]?.balance,
            ultima_sincronizacao: new Date().toISOString(),
          })
          .eq('id', conta.id);

        console.log(`Imported ${transactions.length} transactions for account ${conta.id}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in pluggy-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
