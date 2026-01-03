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
        const { itemId } = await req.json();

        // Get Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from auth header
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

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

        // First, get the item details to extract connectorId
        console.log(`Fetching item details for ${itemId}...`);
        const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (!itemResponse.ok) {
            throw new Error('Failed to fetch item details');
        }

        const itemData = await itemResponse.json();
        const connectorId = itemData.connector?.id;

        if (!connectorId) {
            throw new Error('Connector ID not found in item data');
        }

        console.log(`Enabling DDA for connector ${connectorId}...`);

        // Check if connector supports boleto management
        // Common connectors that support DDA: Banco do Brasil, Caixa, Santander, Bradesco, Itaú
        // Nubank and digital banks typically don't support DDA
        const connectorResponse = await fetch(`https://api.pluggy.ai/connectors/${connectorId}`, {
            headers: { 'X-API-KEY': apiKey }
        });

        if (connectorResponse.ok) {
            const connectorData = await connectorResponse.json();
            console.log(`Connector info:`, connectorData);

            // Check if connector has boleto management capability
            const hasBoletoManagement = connectorData.products?.includes('BOLETO_MANAGEMENT') ||
                connectorData.capabilities?.includes('BOLETO_MANAGEMENT');

            if (!hasBoletoManagement) {
                throw new Error(`O banco ${connectorData.name} não suporta DDA. Apenas alguns bancos tradicionais oferecem essa funcionalidade.`);
            }
        }

        // Enable DDA (Create Boleto Connection)
        // Based on https://docs.pluggy.ai/reference/boleto-connection-create
        // Requires connectorId (integer) and credentials (object with user/password)
        const ddaResponse = await fetch('https://api.pluggy.ai/boleto-connections', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectorId: connectorId,
                credentials: itemData.credentials || {}
            }),
        });

        if (!ddaResponse.ok) {
            const errorText = await ddaResponse.text();
            console.error('Error enabling DDA:', errorText);
            throw new Error(`Failed to enable DDA: ${errorText}`);
        }

        const ddaData = await ddaResponse.json();
        console.log('DDA enabled successfully:', ddaData);

        // Update local database to mark DDA as enabled for this item's accounts
        const { error: updateError } = await supabase
            .from('contas_bancarias')
            .update({ dda_enabled: true })
            .eq('pluggy_item_id', itemId);

        if (updateError) {
            console.error('Error updating local database:', updateError);
        }

        return new Response(
            JSON.stringify({ message: 'DDA enabled successfully', data: ddaData }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
