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

// Sanitize cell content to prevent formula injection
function sanitizeCell(value: string): string {
  if (!value) return '';
  
  const trimmed = value.trim();
  
  // Remove formula characters at the start
  if (trimmed.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(trimmed[0])) {
    return "'" + trimmed;
  }
  
  return trimmed;
}

// Validate date format (YYYY-MM-DD)
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// Validate numeric value
function isValidNumber(numStr: string): boolean {
  const cleaned = numStr.replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num);
}

// Processar CSV with proper validation and sanitization
function processarCSV(content: string): Transaction[] {
  console.log('Processando arquivo CSV');
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (content.length > maxSize) {
    throw new Error('Arquivo CSV muito grande. Máximo permitido: 10MB');
  }
  
  const lines = content.trim().split('\n');
  const maxRows = 10000;
  
  if (lines.length > maxRows) {
    throw new Error(`Arquivo CSV possui muitas linhas. Máximo permitido: ${maxRows}`);
  }
  
  const transactions: Transaction[] = [];
  const errors: string[] = [];
  
  // Assumindo formato: data,descricao,valor,tipo
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Simple CSV parsing (handles basic quoted fields)
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current);
      
      if (parts.length < 3) {
        errors.push(`Linha ${i + 1}: formato inválido (mínimo 3 campos necessários)`);
        continue;
      }
      
      const data = sanitizeCell(parts[0]);
      const descricao = sanitizeCell(parts[1]);
      const valorStr = sanitizeCell(parts[2]);
      
      // Validate date
      if (!isValidDate(data)) {
        errors.push(`Linha ${i + 1}: data inválida "${data}" (formato esperado: YYYY-MM-DD)`);
        continue;
      }
      
      // Validate and parse value
      if (!isValidNumber(valorStr)) {
        errors.push(`Linha ${i + 1}: valor inválido "${valorStr}"`);
        continue;
      }
      
      const valor = parseFloat(valorStr.replace(/[^\d.,-]/g, '').replace(',', '.'));
      
      // Validate reasonable amount range
      if (Math.abs(valor) > 999999999) {
        errors.push(`Linha ${i + 1}: valor fora do intervalo permitido`);
        continue;
      }
      
      transactions.push({
        data,
        descricao: descricao || 'Transação importada',
        valor: Math.abs(valor),
        tipo: valor < 0 ? 'despesa' : 'receita'
      });
    } catch (error) {
      errors.push(`Linha ${i + 1}: erro ao processar - ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn('Erros durante processamento CSV:', errors.slice(0, 10));
  }
  
  if (transactions.length === 0 && errors.length > 0) {
    throw new Error(`Nenhuma transação válida encontrada. Primeiros erros: ${errors.slice(0, 3).join('; ')}`);
  }
  
  return transactions;
}

// Processar OFX with validation
function processarOFX(content: string): Transaction[] {
  console.log('Processando arquivo OFX');
  
  // Validate file size (max 5MB for XML)
  const maxSize = 5 * 1024 * 1024;
  if (content.length > maxSize) {
    throw new Error('Arquivo OFX muito grande. Máximo permitido: 5MB');
  }
  
  const transactions: Transaction[] = [];
  const errors: string[] = [];
  
  // Add timeout protection for regex operations
  const startTime = Date.now();
  const timeout = 30000; // 30 seconds
  
  try {
    // Regex para extrair transações do OFX with timeout check
    const transactionRegex = /<STMTTRN>([\s\S]{0,5000}?)<\/STMTTRN>/g;
    const matches = content.matchAll(transactionRegex);
    
    let count = 0;
    const maxTransactions = 10000;
    
    for (const match of matches) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout ao processar arquivo OFX - arquivo muito complexo');
      }
      
      if (count++ > maxTransactions) {
        throw new Error(`Limite de transações excedido (máximo: ${maxTransactions})`);
      }
      
      const trn = match[1];
      const dateMatch = trn.match(/<DTPOSTED>(\d{8})/);
      const amountMatch = trn.match(/<TRNAMT>([-\d.]+)/);
      const memoMatch = trn.match(/<MEMO>(.*?)(?:<|$)/);
      
      if (dateMatch && amountMatch) {
        const date = dateMatch[1];
        const formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`;
        
        // Validate date
        if (!isValidDate(formattedDate)) {
          errors.push(`Data inválida encontrada: ${formattedDate}`);
          continue;
        }
        
        const valor = parseFloat(amountMatch[1]);
        
        // Validate amount is reasonable
        if (isNaN(valor) || !isFinite(valor) || Math.abs(valor) > 999999999) {
          errors.push(`Valor inválido encontrado: ${amountMatch[1]}`);
          continue;
        }
        
        const descricao = memoMatch ? sanitizeCell(memoMatch[1].trim()) : 'Transação importada';
        
        transactions.push({
          data: formattedDate,
          descricao,
          valor: Math.abs(valor),
          tipo: valor < 0 ? 'despesa' : 'receita'
        });
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao processar arquivo OFX');
  }
  
  if (errors.length > 0) {
    console.warn('Erros durante processamento OFX:', errors.slice(0, 10));
  }
  
  return transactions;
}

// Processar PDF usando Lovable AI with security controls
async function processarPDF(content: string): Promise<Transaction[]> {
  console.log('Processando extrato PDF com IA');
  
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY não configurada');
  }

  // Decodificar base64 se necessário
  let pdfText: string;
  try {
    // Tentar decodificar de base64
    const decoded = atob(content);
    // Extrair texto do PDF (simplificado - pega apenas texto visível)
    pdfText = decoded.replace(/[^\x20-\x7E\n]/g, ' ').trim();
    console.log('PDF decodificado, tamanho do texto:', pdfText.length);
  } catch (e) {
    // Se falhar, assumir que já é texto
    pdfText = content;
    console.log('Usando conteúdo como texto direto');
  }

  // Sanitizar e limitar tamanho
  const sanitizedContent = pdfText.substring(0, 30000);
  
  const prompt = `Você é um especialista em extrair dados de extratos bancários brasileiros. Analise este extrato e extraia TODAS as transações financeiras.

REGRAS CRÍTICAS:
1. Retorne APENAS um array JSON válido - sem markdown, sem explicações, sem texto extra
2. Não use aspas triplas (\`\`\`) ou qualquer formatação
3. Se não encontrar transações, retorne um array vazio: []
4. Valores sempre positivos (o tipo indica se é receita ou despesa)

FORMATO EXATO para cada transação:
{
  "data": "YYYY-MM-DD",
  "descricao": "descrição clara da transação",
  "valor": 1234.56,
  "tipo": "receita" ou "despesa"
}

IDENTIFICAÇÃO DE TIPO:
- "receita": depósitos, créditos, transferências recebidas, salário, PIX recebido
- "despesa": saques, débitos, pagamentos, compras, PIX enviado, taxas

DATAS: Converter para formato YYYY-MM-DD. Se o ano não estiver claro, usar 2025.

EXEMPLO DE RESPOSTA VÁLIDA:
[{"data":"2025-01-15","descricao":"PIX recebido de João Silva","valor":500.50,"tipo":"receita"},{"data":"2025-01-16","descricao":"Compra no supermercado","valor":150.75,"tipo":"despesa"}]

EXTRATO:
${sanitizedContent}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'Você é um extrator especializado em extratos bancários brasileiros. SEMPRE retorne APENAS um array JSON válido, sem nenhum texto adicional, sem markdown, sem explicações. Se não encontrar transações, retorne []. Formato obrigatório: [{"data":"YYYY-MM-DD","descricao":"texto","valor":numero,"tipo":"receita ou despesa"}]' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na API de IA:', response.status, errorText);
    throw new Error(`Erro ao processar PDF com IA: ${response.status}`);
  }

  const data = await response.json();
  const resultText = data.choices[0]?.message?.content;
  
  if (!resultText) {
    throw new Error('IA retornou resposta vazia');
  }
  
  console.log('Resposta da IA (primeiros 1000 chars):', resultText.substring(0, 1000));
  
  // Limpar resposta removendo markdown e texto extra
  let cleanedText = resultText.trim();
  
  // Remover blocos de código markdown
  if (cleanedText.includes('```')) {
    const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanedText = codeBlockMatch[1].trim();
    }
  }
  
  // Encontrar o array JSON na resposta
  const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('JSON não encontrado na resposta. Conteúdo completo:', cleanedText);
    throw new Error('O PDF não contém um extrato bancário válido ou está em formato não suportado. Tente um PDF com texto selecionável.');
  }
  
  let parsedTransactions: any[];
  try {
    parsedTransactions = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao fazer parse do JSON:', jsonMatch[0].substring(0, 500));
    throw new Error('Formato de resposta inválido da IA. Tente novamente ou use outro arquivo.');
  }
  
  if (!Array.isArray(parsedTransactions)) {
    throw new Error('IA não retornou um array de transações');
  }
  
  if (parsedTransactions.length === 0) {
    throw new Error('Nenhuma transação foi encontrada no PDF. Verifique se o arquivo contém um extrato bancário válido com transações.');
  }
  
  // Validar e normalizar transações
  const validatedTransactions: Transaction[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < parsedTransactions.length && i < 10000; i++) {
    const trn = parsedTransactions[i];
    
    // Validar campos obrigatórios
    if (!trn.data || !trn.descricao || trn.valor === undefined || trn.valor === null || !trn.tipo) {
      console.warn('Transação incompleta ignorada:', trn);
      continue;
    }
    
    // Validar formato de data
    if (!isValidDate(trn.data)) {
      console.warn('Data inválida ignorada:', trn.data);
      continue;
    }
    
    // Validar valor numérico
    const valorNum = parseFloat(trn.valor.toString());
    if (isNaN(valorNum) || valorNum <= 0) {
      console.warn('Valor inválido ignorado:', trn.valor);
      continue;
    }
    
    // Validar tipo
    if (trn.tipo !== 'receita' && trn.tipo !== 'despesa') {
      console.warn('Tipo inválido ignorado:', trn.tipo);
      continue;
    }
    
    validatedTransactions.push({
      data: trn.data,
      descricao: sanitizeCell(String(trn.descricao).substring(0, 500)), // Limitar tamanho
      valor: valorNum,
      tipo: trn.tipo as 'receita' | 'despesa'
    });
  }
  
  if (validatedTransactions.length === 0) {
    throw new Error('Nenhuma transação válida foi extraída. Verifique se o PDF contém transações em formato legível.');
  }
  
  console.log(`✓ Extraídas ${validatedTransactions.length} transações válidas do PDF`);
  return validatedTransactions;
}

// Função para detectar e vincular transferências entre contas
async function detectarTransferencias(supabase: any, userId: string, contaId?: string) {
  try {
    // Buscar transações recentes (últimos 30 dias) não vinculadas
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    const query = supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', userId)
      .gte('data_transacao', dataLimite.toISOString().split('T')[0])
      .is('transferencia_vinculada_id', null);

    if (contaId) {
      query.eq('conta_bancaria_id', contaId);
    }

    const { data: transacoes, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return;
    }

    console.log(`📊 Analisando ${transacoes.length} transações para detectar transferências...`);

    let transferenciasDetectadas = 0;

    // Para cada transação, procurar sua par (entrada/saída com mesmo valor e data próxima)
    for (const transacao of transacoes) {
      // Pular se já está vinculada
      if (transacao.transferencia_vinculada_id) continue;

      // Determinar tipo oposto
      const tipoOposto = transacao.tipo === 'receita' ? 'despesa' : 'receita';

      // Buscar transação correspondente:
      // - Mesmo valor
      // - Tipo oposto
      // - Mesma data ou data próxima (até 2 dias de diferença)
      // - Conta diferente
      // - Ainda não vinculada
      const dataTransacao = new Date(transacao.data_transacao);
      const dataMin = new Date(dataTransacao);
      const dataMax = new Date(dataTransacao);
      dataMin.setDate(dataMin.getDate() - 2);
      dataMax.setDate(dataMax.getDate() + 2);

      const { data: candidatos } = await supabase
        .from('transacoes')
        .select('*')
        .eq('user_id', userId)
        .eq('tipo', tipoOposto)
        .eq('valor', transacao.valor)
        .neq('conta_bancaria_id', transacao.conta_bancaria_id)
        .gte('data_transacao', dataMin.toISOString().split('T')[0])
        .lte('data_transacao', dataMax.toISOString().split('T')[0])
        .is('transferencia_vinculada_id', null)
        .limit(1);

      if (candidatos && candidatos.length > 0) {
        const par = candidatos[0];

        // Vincular as duas transações
        const tipoOrigem = transacao.tipo === 'despesa' ? 'origem' : 'destino';
        const tipoDestino = par.tipo === 'despesa' ? 'origem' : 'destino';

        await supabase
          .from('transacoes')
          .update({
            transferencia_vinculada_id: par.id,
            tipo_transferencia: tipoOrigem,
          })
          .eq('id', transacao.id);

        await supabase
          .from('transacoes')
          .update({
            transferencia_vinculada_id: transacao.id,
            tipo_transferencia: tipoDestino,
          })
          .eq('id', par.id);

        transferenciasDetectadas++;
        console.log(`✅ Transferência detectada: ${transacao.descricao} <-> ${par.descricao} (R$ ${transacao.valor})`);
      }
    }

    console.log(`✅ Total de ${transferenciasDetectadas} transferências detectadas e vinculadas`);
  } catch (error) {
    console.error('❌ Erro ao detectar transferências:', error);
  }
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

    // Inserir transações com verificação de duplicatas
    let importadas = 0;
    let duplicadas = 0;
    
    for (const trn of transactions) {
      // Extrair mês e ano da data da transação
      const dataTransacao = new Date(trn.data);
      const ano = dataTransacao.getFullYear();
      const mes = dataTransacao.getMonth() + 1;
      const primeiroDiaMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDiaMes = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
      
      // Verificar se já existe transação duplicada no mesmo mês
      // com mesma descrição, valor e tipo (mesmo que em data diferente do mês)
      const { data: duplicata, error: erroConsulta } = await supabaseClient
        .from('transacoes')
        .select('id, data_transacao, descricao, valor')
        .eq('user_id', user.id)
        .eq('conta_bancaria_id', importacao.conta_bancaria_id)
        .eq('descricao', trn.descricao)
        .eq('valor', trn.valor)
        .eq('tipo', trn.tipo)
        .gte('data_transacao', primeiroDiaMes)
        .lte('data_transacao', ultimoDiaMes)
        .limit(1);
      
      if (erroConsulta) {
        console.error('Erro ao verificar duplicata:', erroConsulta);
      }
      
      if (duplicata && duplicata.length > 0) {
        duplicadas++;
        console.log(`✗ Duplicada ignorada: ${trn.descricao} - R$ ${trn.valor} (${trn.data}) - Já existe em ${duplicata[0].data_transacao}`);
        continue;
      }
      
      // Inserir transação se não for duplicada
      const { error } = await supabaseClient
        .from('transacoes')
        .insert({
          user_id: user.id,
          conta_bancaria_id: importacao.conta_bancaria_id,
          data_transacao: trn.data,
          descricao: trn.descricao,
          valor: trn.valor,
          tipo: trn.tipo,
          status: 'pago',
          origem: 'importacao',
          arquivo_origem: tipoArquivo,
          data_competencia: trn.data
        });

      if (!error) {
        importadas++;
        console.log(`✓ Importada: ${trn.descricao} - R$ ${trn.valor} (${trn.data})`);
      } else {
        console.error('Erro ao inserir transação:', error);
      }
    }

    // Detectar e vincular transferências entre contas
    console.log('🔄 Detectando transferências entre contas...');
    await detectarTransferencias(supabaseClient, user.id, importacao.conta_bancaria_id);

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

    console.log(`Importação concluída: ${importadas}/${transactions.length} transações (${duplicadas} duplicadas ignoradas)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: transactions.length,
        importadas,
        duplicadas
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