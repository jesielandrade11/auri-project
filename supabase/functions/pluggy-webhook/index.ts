import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pluggy-signature',
};

// Verify Pluggy webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Validate webhook event structure
function validateEventStructure(event: any): boolean {
  if (!event || typeof event !== 'object') return false;
  if (!event.event || typeof event.event !== 'string') return false;
  if (!event.data || typeof event.data !== 'object') return false;
  
  const allowedEvents = ['item/created', 'item/updated', 'item/deleted', 'item/error'];
  if (!allowedEvents.includes(event.event)) return false;
  
  return true;
}

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
    const PLUGGY_WEBHOOK_SECRET = Deno.env.get('PLUGGY_WEBHOOK_SECRET');

    console.log('📥 Pluggy webhook triggered');
    console.log('Credentials present:', !!PLUGGY_CLIENT_ID, !!PLUGGY_CLIENT_SECRET, 'Webhook secret:', !!PLUGGY_WEBHOOK_SECRET);

    // Get raw request body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-pluggy-signature');

    // Verify webhook signature if secret is configured
    if (PLUGGY_WEBHOOK_SECRET) {
      if (!signature) {
        console.error('❌ Missing webhook signature');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!verifyWebhookSignature(rawBody, signature, PLUGGY_WEBHOOK_SECRET)) {
        console.error('❌ Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ PLUGGY_WEBHOOK_SECRET not configured - signature verification skipped');
    }

    const event = JSON.parse(rawBody);
    
    // Validate event structure
    if (!validateEventStructure(event)) {
      console.error('❌ Invalid webhook event structure');
      return new Response(JSON.stringify({ error: 'Invalid event structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📦 Webhook event received:', JSON.stringify(event, null, 2));

    console.log('🔐 Authenticating with Pluggy for webhook processing...');

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
      const errorText = await authResponse.text();
      console.error('❌ Auth failed in webhook:', authResponse.status, errorText);
      throw new Error(`Authentication failed: ${errorText}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('✅ Webhook authenticated with Pluggy');

    // Handle different event types
    if (event.event === 'item/created' || event.event === 'item/updated') {
      const itemId = event.data.id;
      console.log(`🏦 Processing ${event.event} for item ${itemId}`);
      
      // Fetch accounts for this item
      const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      
      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error('❌ Failed to fetch accounts:', errorText);
        throw new Error(`Failed to fetch accounts: ${errorText}`);
      }
      
      const { results: accounts } = await accountsResponse.json();
      console.log(`✅ Found ${accounts.length} accounts for item ${itemId}`);

      // Fetch transactions
      if (accounts.length > 0) {
        const accountId = accounts[0].id;
        console.log(`💳 Fetching transactions for account ${accountId}`);
        
        const transactionsResponse = await fetch(`https://api.pluggy.ai/transactions?accountId=${accountId}`, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!transactionsResponse.ok) {
          const errorText = await transactionsResponse.text();
          console.error('❌ Failed to fetch transactions:', errorText);
          throw new Error(`Failed to fetch transactions: ${errorText}`);
        }

        const { results: transactions } = await transactionsResponse.json();
        console.log(`✅ Found ${transactions.length} transactions`);

        // Find the conta_bancaria linked to this Pluggy item
        console.log(`🔍 Looking for account with pluggy_item_id: ${itemId}`);
        
        const { data: conta, error: contaError } = await supabase
          .from('contas_bancarias')
          .select('*')
          .eq('pluggy_item_id', itemId)
          .single();

        if (contaError) {
          console.error('❌ Error finding account:', contaError);
        }

        if (conta) {
          console.log(`✅ Found account in database: ${conta.id}`);
          
          // Import transactions
          let imported = 0;
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
              console.error('❌ Error inserting transaction:', error);
            } else {
              imported++;
            }
          }

          console.log(`✅ Imported ${imported}/${transactions.length} transactions`);

          // Update account balance
          const { error: updateError } = await supabase
            .from('contas_bancarias')
            .update({ 
              saldo_atual: accounts[0]?.balance,
              ultima_sincronizacao: new Date().toISOString(),
            })
            .eq('id', conta.id);

          if (updateError) {
            console.error('❌ Error updating account:', updateError);
          } else {
            console.log(`✅ Updated account ${conta.id} balance and sync time`);
          }
        } else {
          console.warn(`⚠️ No account found in database for item ${itemId}`);
        }
      } else {
        console.log('⚠️ No accounts found from Pluggy for this item');
      }
    } else {
      console.log(`ℹ️ Ignoring event type: ${event.event}`);
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
