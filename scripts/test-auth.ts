
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    console.log('Testing connection to:', supabaseUrl);
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log('Attempting to sign up user:', email);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Signup Error:', error.message);
        console.error('Full Error:', error);
    } else {
        console.log('Signup Success!');
        console.log('User ID:', data.user?.id);
        console.log('Session:', data.session ? 'Created' : 'Not created (Email confirmation likely required)');
    }
}

testSignup();
