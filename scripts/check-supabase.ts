import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log('🔍 Checking Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('');

    // Test 1: Check if we can connect
    console.log('Test 1: Basic connectivity');
    try {
        const { data, error } = await supabase.from('contas_bancarias').select('count');
        if (error) {
            console.log('⚠️  Table query error:', error.message);
            console.log('   This is expected if tables don\'t exist yet');
        } else {
            console.log('✅ Connected successfully');
        }
    } catch (e: any) {
        console.log('❌ Connection failed:', e.message);
    }

    console.log('');

    // Test 2: Try to sign up a test user
    console.log('Test 2: Creating test user');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Test123456!';

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
    });

    if (signupError) {
        console.log('❌ Signup failed:', signupError.message);
    } else {
        console.log('✅ User created successfully!');
        console.log('   User ID:', signupData.user?.id);
        console.log('   Email:', signupData.user?.email);
        console.log('   Session:', signupData.session ? '✅ Active' : '⚠️  Needs confirmation');
    }

    console.log('');

    // Test 3: Check if tables exist
    console.log('Test 3: Checking if tables exist');
    const tables = ['contas_bancarias', 'categorias', 'centros_custo', 'transacoes', 'budgets'];

    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ ${table}: NOT FOUND`);
        } else {
            console.log(`✅ ${table}: EXISTS`);
        }
    }

    console.log('');
    console.log('📋 Summary:');
    console.log('If you see "NOT FOUND" for tables, you need to run the SQL script in Supabase SQL Editor.');
    console.log('If signup failed, check Authentication settings in Supabase dashboard.');
}

checkConnection();
