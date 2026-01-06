// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID')
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the user that called the function.
    const supabaseClient = createClient(
      // Supabase API URL - env var automatically populated by Supabase
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase Anon Key - env var automatically populated by Supabase
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    console.log('Authenticating with Pluggy...')

    // 1. Authenticate with Pluggy to get API Key
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('Pluggy Auth Error:', errorText)
      throw new Error(`Pluggy Auth Failed: ${errorText}`)
    }

    const authData = await authResponse.json()
    const apiKey = authData.apiKey

    console.log('Got API Key, creating Connect Token...')

    const { itemId } = await req.json().catch(() => ({ itemId: undefined }));

    // 2. Create Connect Token
    const connectTokenResponse = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        itemId: itemId, // Optional: for updating an existing item
        options: {
          clientUserId: user.id, // Use Supabase User ID for traceability
        },
      }),
    })

    if (!connectTokenResponse.ok) {
      const errorText = await connectTokenResponse.text()
      console.error('Pluggy Connect Token Error:', errorText)
      throw new Error(`Pluggy Connect Token Failed: ${errorText}`)
    }

    const connectTokenData = await connectTokenResponse.json()

    console.log('Connect Token created successfully')

    return new Response(
      JSON.stringify({ accessToken: connectTokenData.accessToken }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Function Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
