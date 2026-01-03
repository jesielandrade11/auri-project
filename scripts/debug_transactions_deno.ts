
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTransactions() {
    const { data: transactions, error } = await supabase
        .from('transacoes')
        .select('*')
        .or('descricao.ilike.%Renegociação%,descricao.ilike.%Crédito de parcelamento%')
        .limit(10);

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    console.log('Found transactions:', transactions.length);
    transactions.forEach(t => {
        console.log('------------------------------------------------');
        console.log(`Description: ${t.descricao}`);
        console.log(`Type (Stored): ${t.tipo}`);
        console.log(`Value: ${t.valor}`);
        console.log(`Metadata:`, JSON.stringify(t.metadata, null, 2));
        console.log(`Bill ID: ${t.bill_id}`);
    });
}

debugTransactions();
