/**
 * Serviço de parsing de arquivos bancários
 * Suporta: OFX, CSV, PDF
 */

export interface TransacaoParsed {
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  saldo?: number;
  categoria?: string;
  numeroDocumento?: string;
}

export interface ResultadoImportacao {
  sucesso: boolean;
  transacoes: TransacaoParsed[];
  erros: string[];
  avisos: string[];
  metadata: {
    total: number;
    receitas: number;
    despesas: number;
    valorTotal: number;
  };
}

/**
 * Parser de arquivos OFX (Open Financial Exchange)
 */
export async function parseOFX(file: File): Promise<ResultadoImportacao> {
  try {
    const texto = await file.text();
    const transacoes: TransacaoParsed[] = [];
    const erros: string[] = [];
    const avisos: string[] = [];

    // Extrair transações do OFX
    const transactionPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    const matches = texto.matchAll(transactionPattern);

    for (const match of matches) {
      const transactionBlock = match[1];
      
      try {
        // Extrair campos
        const tipo = extractOFXField(transactionBlock, 'TRNTYPE');
        const data = extractOFXField(transactionBlock, 'DTPOSTED');
        const valor = parseFloat(extractOFXField(transactionBlock, 'TRNAMT'));
        const descricao = extractOFXField(transactionBlock, 'MEMO') || 
                         extractOFXField(transactionBlock, 'NAME');
        const numeroDocumento = extractOFXField(transactionBlock, 'FITID');

        if (!data || isNaN(valor) || !descricao) {
          avisos.push(`Transação incompleta ignorada: ${descricao || 'sem descrição'}`);
          continue;
        }

        // Converter data OFX (YYYYMMDD) para ISO
        const dataFormatada = `${data.substring(0, 4)}-${data.substring(4, 6)}-${data.substring(6, 8)}`;

        transacoes.push({
          data: dataFormatada,
          descricao: descricao.trim(),
          valor: Math.abs(valor),
          tipo: valor >= 0 ? "receita" : "despesa",
          numeroDocumento: numeroDocumento || undefined,
        });
      } catch (error) {
        erros.push(`Erro ao processar transação: ${error}`);
      }
    }

    return montarResultado(transacoes, erros, avisos);
  } catch (error) {
    return {
      sucesso: false,
      transacoes: [],
      erros: [`Erro ao ler arquivo OFX: ${error}`],
      avisos: [],
      metadata: { total: 0, receitas: 0, despesas: 0, valorTotal: 0 },
    };
  }
}

/**
 * Parser de arquivos CSV
 */
export async function parseCSV(file: File, config?: {
  delimiter?: string;
  dateFormat?: string;
  columnsMap?: {
    data?: number;
    descricao?: number;
    valor?: number;
    tipo?: number;
  };
}): Promise<ResultadoImportacao> {
  try {
    const texto = await file.text();
    const linhas = texto.split('\n').filter(l => l.trim());
    const transacoes: TransacaoParsed[] = [];
    const erros: string[] = [];
    const avisos: string[] = [];

    const delimiter = config?.delimiter || ',';
    const colunas = config?.columnsMap || {
      data: 0,
      descricao: 1,
      valor: 2,
      tipo: 3,
    };

    // Ignorar cabeçalho
    const linhasDados = linhas.slice(1);

    for (let i = 0; i < linhasDados.length; i++) {
      const linha = linhasDados[i];
      const campos = linha.split(delimiter).map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));

      try {
        const dataStr = campos[colunas.data || 0];
        const descricao = campos[colunas.descricao || 1];
        let valorStr = campos[colunas.valor || 2];
        
        // Limpar valor (remover R$, pontos, converter vírgula)
        valorStr = valorStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        const valor = parseFloat(valorStr);

        if (!dataStr || !descricao || isNaN(valor)) {
          avisos.push(`Linha ${i + 2} ignorada: dados incompletos`);
          continue;
        }

        // Tentar converter data (DD/MM/YYYY ou YYYY-MM-DD)
        let dataFormatada: string;
        if (dataStr.includes('/')) {
          const [dia, mes, ano] = dataStr.split('/');
          dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } else {
          dataFormatada = dataStr;
        }

        // Detectar tipo
        let tipo: "receita" | "despesa" = "despesa";
        if (colunas.tipo !== undefined) {
          const tipoStr = campos[colunas.tipo].toLowerCase();
          tipo = tipoStr.includes('crédito') || tipoStr.includes('receita') || valor > 0 
            ? "receita" 
            : "despesa";
        } else {
          tipo = valor >= 0 ? "receita" : "despesa";
        }

        transacoes.push({
          data: dataFormatada,
          descricao: descricao.trim(),
          valor: Math.abs(valor),
          tipo,
        });
      } catch (error) {
        erros.push(`Erro na linha ${i + 2}: ${error}`);
      }
    }

    return montarResultado(transacoes, erros, avisos);
  } catch (error) {
    return {
      sucesso: false,
      transacoes: [],
      erros: [`Erro ao ler arquivo CSV: ${error}`],
      avisos: [],
      metadata: { total: 0, receitas: 0, despesas: 0, valorTotal: 0 },
    };
  }
}

/**
 * Parser de arquivos PDF (básico - requer OCR para PDFs complexos)
 */
export async function parsePDF(file: File): Promise<ResultadoImportacao> {
  try {
    // Para PDFs, seria necessário usar uma biblioteca como pdf.js ou pdfjs-dist
    // Por enquanto, vamos retornar um aviso de que PDF requer processamento especial
    
    return {
      sucesso: false,
      transacoes: [],
      erros: [],
      avisos: [
        'PDFs requerem processamento OCR avançado.',
        'Recomendamos usar OFX ou CSV para importação automática.',
        'Para PDFs, considere usar a ferramenta online de conversão do seu banco.',
      ],
      metadata: { total: 0, receitas: 0, despesas: 0, valorTotal: 0 },
    };
  } catch (error) {
    return {
      sucesso: false,
      transacoes: [],
      erros: [`Erro ao processar PDF: ${error}`],
      avisos: [],
      metadata: { total: 0, receitas: 0, despesas: 0, valorTotal: 0 },
    };
  }
}

/**
 * Função principal de parsing que detecta o tipo de arquivo
 */
export async function parseArquivoBancario(file: File): Promise<ResultadoImportacao> {
  const extensao = file.name.split('.').pop()?.toLowerCase();

  switch (extensao) {
    case 'ofx':
      return parseOFX(file);
    case 'csv':
      return parseCSV(file);
    case 'pdf':
      return parsePDF(file);
    default:
      return {
        sucesso: false,
        transacoes: [],
        erros: [`Formato de arquivo não suportado: ${extensao}`],
        avisos: ['Formatos suportados: OFX, CSV, PDF'],
        metadata: { total: 0, receitas: 0, despesas: 0, valorTotal: 0 },
      };
  }
}

/**
 * Detecta transações duplicadas
 */
export function detectarDuplicatas(
  novasTransacoes: TransacaoParsed[],
  transacoesExistentes: Array<{ data_transacao: string; descricao: string; valor: number }>
): {
  unicas: TransacaoParsed[];
  duplicatas: TransacaoParsed[];
} {
  const unicas: TransacaoParsed[] = [];
  const duplicatas: TransacaoParsed[] = [];

  for (const nova of novasTransacoes) {
    const isDuplicata = transacoesExistentes.some(
      existente =>
        existente.data_transacao === nova.data &&
        existente.descricao.toLowerCase().includes(nova.descricao.toLowerCase().substring(0, 20)) &&
        Math.abs(Number(existente.valor) - nova.valor) < 0.01
    );

    if (isDuplicata) {
      duplicatas.push(nova);
    } else {
      unicas.push(nova);
    }
  }

  return { unicas, duplicatas };
}

// Funções auxiliares

function extractOFXField(block: string, fieldName: string): string {
  const regex = new RegExp(`<${fieldName}>([^<]*)`);
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function montarResultado(
  transacoes: TransacaoParsed[],
  erros: string[],
  avisos: string[]
): ResultadoImportacao {
  const receitas = transacoes.filter(t => t.tipo === "receita");
  const despesas = transacoes.filter(t => t.tipo === "despesa");
  const valorTotal = transacoes.reduce((sum, t) => 
    sum + (t.tipo === "receita" ? t.valor : -t.valor), 0
  );

  return {
    sucesso: erros.length === 0 && transacoes.length > 0,
    transacoes,
    erros,
    avisos,
    metadata: {
      total: transacoes.length,
      receitas: receitas.length,
      despesas: despesas.length,
      valorTotal,
    },
  };
}

/**
 * Valida e normaliza transações importadas
 */
export function validarTransacoes(transacoes: TransacaoParsed[]): {
  validas: TransacaoParsed[];
  invalidas: Array<{ transacao: TransacaoParsed; erro: string }>;
} {
  const validas: TransacaoParsed[] = [];
  const invalidas: Array<{ transacao: TransacaoParsed; erro: string }> = [];

  for (const t of transacoes) {
    let erro = '';

    // Validar data
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(t.data);
    if (!dataValida) {
      erro = 'Data inválida';
    }

    // Validar valor
    if (isNaN(t.valor) || t.valor <= 0) {
      erro = 'Valor inválido';
    }

    // Validar descrição
    if (!t.descricao || t.descricao.trim().length < 3) {
      erro = 'Descrição muito curta';
    }

    if (erro) {
      invalidas.push({ transacao: t, erro });
    } else {
      validas.push(t);
    }
  }

  return { validas, invalidas };
}
