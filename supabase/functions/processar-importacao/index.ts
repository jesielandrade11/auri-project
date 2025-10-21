import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  data: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
}

// Processar CSV
function processarCSV(content: string): Transaction[] {
  console.log('Processando arquivo CSV');
  const lines = content.trim().split('\n');
  const transactions: Transaction[] = [];
  
  // Assumindo formato: data,descricao,valor,tipo
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 3) {
      const valor = parseFloat(parts[2].replace(/[^\d.,-]/g, '').replace(',', '.'));
      transactions.push({
        data: parts[0],
        descricao: parts[1],
        valor: Math.abs(valor),
        tipo: valor < 0 ? 'despesa' : 'receita'
      });
    }
  }
  
  return transactions;
}

// Processar OFX
function processarOFX(content: string): Transaction[] {
  console.log('Processando arquivo OFX');
  const transactions: Transaction[] = [];
  
  // Regex para extrair transações do OFX
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const matches = content.matchAll(transactionRegex);
  
  for (const match of matches) {
    const trn = match[1];
    const dateMatch = trn.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = trn.match(/<TRNAMT>([-\d.]+)/);
    const memoMatch = trn.match(/<MEMO>(.*?)(?:<|$)/);
    
    if (dateMatch && amountMatch) {
      const date = dateMatch[1];
      const formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`;
      const valor = parseFloat(amountMatch[1]);
      
      transactions.push({
        data: formattedDate,
        descricao: memoMatch ? memoMatch[1].trim() : 'Transação importada',
        valor: Math.abs(valor),
        tipo: valor < 0 ? 'despesa' : 'receita'
      });
    }
  }
  
  return transactions;
}

// Processar PDF usando Lovable AI
async function processarPDF(content: string): Promise<Transaction[]> {
  console.log('Processando extrato PDF com IA');
  
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }
  
  const prompt = `Analise este extrato bancário e extraia todas as transações.
Para cada transação, retorne um JSON com:
- data (formato YYYY-MM-DD)
- descricao (descrição da transação)
- valor (valor numérico positivo)
- tipo ("receita" ou "despesa")

Retorne APENAS um array JSON válido, sem texto adicional.

Extrato:
${content}`;

  const response = await fetch('https://api.lovable.app/v1/ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao processar PDF com IA: ${response.statusText}`);
  }

  const data = await response.json();
  const resultText = data.choices[0].message.content;
  
  // Extrair JSON do resultado
  const jsonMatch = resultText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Não foi possível extrair transações do PDF');
  }
  
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Não autorizado');
    }

    const { importacaoId, tipoArquivo, conteudo } = await req.json();
    
    console.log(`Processando importação ${importacaoId}, tipo: ${tipoArquivo}`);

    let transactions: Transaction[] = [];

    // Processar de acordo com o tipo
    if (tipoArquivo === 'csv') {
      transactions = processarCSV(conteudo);
    } else if (tipoArquivo === 'ofx') {
      transactions = processarOFX(conteudo);
    } else if (tipoArquivo === 'pdf') {
      transactions = await processarPDF(conteudo);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${tipoArquivo}`);
    }

    console.log(`Extraídas ${transactions.length} transações`);

    // Buscar a importação
    const { data: importacao } = await supabaseClient
      .from('importacoes')
      .select('conta_bancaria_id')
      .eq('id', importacaoId)
      .eq('user_id', user.id)
      .single();

    if (!importacao) {
      throw new Error('Importação não encontrada');
    }

    // Inserir transações
    let importadas = 0;
    for (const trn of transactions) {
      const { error } = await supabaseClient
        .from('transacoes')
        .insert({
          user_id: user.id,
          conta_bancaria_id: importacao.conta_bancaria_id,
          data_transacao: trn.data,
          descricao: trn.descricao,
          valor: trn.valor,
          tipo: trn.tipo,
          status: 'concluido',
          origem: 'importacao',
          arquivo_origem: tipoArquivo,
          data_competencia: trn.data
        });

      if (!error) importadas++;
    }

    // Atualizar importação
    await supabaseClient
      .from('importacoes')
      .update({
        status: 'concluido',
        total_transacoes: transactions.length,
        transacoes_importadas: importadas,
        dados_originais: transactions
      })
      .eq('id', importacaoId);

    console.log(`Importação concluída: ${importadas}/${transactions.length} transações`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: transactions.length,
        importadas 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar importação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});