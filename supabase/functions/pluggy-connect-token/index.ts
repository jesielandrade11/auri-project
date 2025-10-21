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
    const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID');
    const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET');

    console.log('🔍 Checking Pluggy credentials for connect token...');
    console.log('CLIENT_ID exists:', !!PLUGGY_CLIENT_ID);
    console.log('CLIENT_SECRET exists:', !!PLUGGY_CLIENT_SECRET);

    if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
      console.error('❌ Pluggy credentials not found');
      throw new Error('Pluggy credentials not configured');
    }

    console.log('🔐 Step 1: Authenticating with Pluggy...');

    // Authenticate with Pluggy
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    console.log('Auth response status:', authResponse.status);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Pluggy auth error:', authResponse.status, errorText);
      throw new Error(`Failed to authenticate with Pluggy: ${errorText}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('✅ Pluggy authentication successful');
    console.log('API Key received:', !!apiKey);

    console.log('🎫 Step 2: Creating connect token...');

    // Create connect token
    const connectTokenResponse = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({}),
    });

    console.log('Connect token response status:', connectTokenResponse.status);

    if (!connectTokenResponse.ok) {
      const errorText = await connectTokenResponse.text();
      console.error('❌ Connect token error:', connectTokenResponse.status, errorText);
      throw new Error(`Failed to create connect token: ${errorText}`);
    }

    const connectTokenData = await connectTokenResponse.json();
    console.log('✅ Connect token created successfully');
    console.log('Access token present:', !!connectTokenData.accessToken);

    return new Response(JSON.stringify(connectTokenData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in pluggy-connect-token function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
