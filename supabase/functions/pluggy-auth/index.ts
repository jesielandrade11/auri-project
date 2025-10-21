import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('🔍 Checking Pluggy credentials...');
    console.log('CLIENT_ID exists:', !!PLUGGY_CLIENT_ID);
    console.log('CLIENT_SECRET exists:', !!PLUGGY_CLIENT_SECRET);
    console.log('CLIENT_ID length:', PLUGGY_CLIENT_ID?.length || 0);
    console.log('CLIENT_SECRET length:', PLUGGY_CLIENT_SECRET?.length || 0);

    if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
      console.error('❌ Pluggy credentials not found in environment variables');
      throw new Error('Pluggy credentials not configured');
    }

    console.log('🔐 Authenticating with Pluggy API...');
    console.log('Using endpoint: https://api.pluggy.ai/auth');

    const requestBody = {
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    };

    console.log('Request body prepared (credentials hidden)');

    const response = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pluggy auth error:', response.status, errorText);
      throw new Error(`Failed to authenticate with Pluggy: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Pluggy authentication successful');
    console.log('API Key received:', !!data.apiKey);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in pluggy-auth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
