import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { 
  LocalParsingConfig, 
  ParseResult, 
  LocalParsingStats 
} from "../interfaces/semanticSearch";

/**
 * Estratégia de parsing local usando Jaccard e Manhattan similarity.
 * Processa PDFs localmente sem necessidade de APIs externas,
 * preenchendo o schema de extração com dados encontrados no PDF.
 * 
 * @param pdfContent - Conteúdo textual completo do PDF
 * @param extractionSchema - Schema com chaves para extração de dados
 * @param config - Configuração dos algoritmos e parâmetros
 * @returns Schema populado com os dados extraídos do PDF
 */
export async function localParsingStrategy(
  pdfContent: string,
  extractionSchema: any,
  config: LocalParsingConfig = { algorithms: 'both' }
): Promise<any> {
  const startTime = Date.now();
  
  // Configuração padrão
  const {
    algorithms = 'both',
    chunkSize = 400,
    threshold = 0.1,
    maxChunks = 20
  } = config;

  // Dividir PDF em chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  
  const chunks = await textSplitter.splitText(pdfContent);
  const limitedChunks = chunks.slice(0, maxChunks);
  
  // Extrair todas as chaves e sub-chaves recursivamente
  const allKeys = extractAllKeys(extractionSchema);
  console.log(`Local parsing: Processing ${allKeys.length} keys across ${limitedChunks.length} chunks`);
  
  // Processar cada chave com os algoritmos selecionados
  const parseResults: ParseResult[] = [];
  
  for (const key of allKeys) {
    const keyResults = processKeyWithAlgorithms(key, limitedChunks, algorithms, threshold);
    parseResults.push(...keyResults);
  }
  
  // Selecionar os melhores chunks únicos
  const uniqueChunks = selectBestUniqueChunks(parseResults);
  
  const endTime = Date.now();
  const processingTime = (endTime - startTime) / 1000;
  
  // Criar estatísticas do processamento
  const stats: LocalParsingStats = {
    processingTimeSeconds: processingTime,
    keysProcessed: allKeys.length,
    chunksAnalyzed: limitedChunks.length,
    resultsFound: parseResults.length,
    uniqueChunksSelected: uniqueChunks.length,
    algorithmsUsed: algorithms === 'both' ? ['jaccard', 'manhattan'] : [algorithms]
  };
  
  console.log(`Local parsing completed in ${stats.processingTimeSeconds.toFixed(2)}s using ${algorithms} algorithm(s)`);
  console.log(`Selected ${stats.uniqueChunksSelected} unique chunks from ${stats.resultsFound} results`);
  console.log(`Processing stats:`, stats);
  
  return uniqueChunks.join('\n\n---\n\n');
}

/**
 * Processa uma chave com os algoritmos selecionados
 */
function processKeyWithAlgorithms(
  key: string, 
  chunks: string[], 
  algorithms: LocalParsingConfig['algorithms'],
  threshold: number
): ParseResult[] {
  const results: ParseResult[] = [];
  
  for (const chunk of chunks) {
    if (algorithms === 'jaccard' || algorithms === 'both') {
      const jaccardScore = jaccardSimilarity(key, chunk);
      if (jaccardScore > threshold) {
        results.push({
          chunk,
          score: jaccardScore,
          algorithm: 'jaccard' as const,
          key
        });
      }
    }
    
    if (algorithms === 'manhattan' || algorithms === 'both') {
      const manhattanScore = manhattanTextSimilarity(key, chunk);
      if (manhattanScore > threshold) {
        results.push({
          chunk,
          score: manhattanScore,
          algorithm: 'manhattan' as const,
          key
        });
      }
    }
  }
  
  return results;
}

/**
 * Seleciona os melhores chunks únicos baseado nos scores
 */
function selectBestUniqueChunks(results: ParseResult[]): string[] {
  // Agrupar por chunk e calcular score combinado
  const chunkScores = new Map<string, number>();
  
  for (const result of results) {
    const currentScore = chunkScores.get(result.chunk) || 0;
    // Peso baseado no algoritmo: Jaccard tem peso maior para textos
    const weight = result.algorithm === 'jaccard' ? 1.2 : 0.8;
    chunkScores.set(result.chunk, currentScore + (result.score * weight));
  }
  
  // Ordenar por score e retornar chunks únicos
  return Array.from(chunkScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, 8) // Máximo 8 chunks
    .map(([chunk]) => chunk);
}

/**
 * Extrai todas as chaves e sub-chaves recursivamente do schema.
 * Foca especialmente nas folhas da árvore onde os valores serão inseridos.
 * 
 * @param schema - Schema de extração (objeto, array ou valor primitivo)
 * @param parentKey - Chave pai para construir chaves compostas
 * @returns Array com todas as chaves únicas encontradas
 */
function extractAllKeys(schema: any, parentKey = ''): string[] {
  const keys: string[] = [];
  
  if (Array.isArray(schema)) {
    // Para arrays, usar a chave pai se existir
    if (parentKey) {
      keys.push(parentKey);
    }
  } else if (typeof schema === 'object' && schema !== null) {
    // Para objetos, extrair chaves recursivamente
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        
        // Verificar se é uma folha (valor final onde será inserido o dado)
        const value = schema[key];
        if (typeof value === 'string' || value === null || value === undefined) {
          // É uma folha - adicionar chave simples e composta
          keys.push(key, fullKey);
        } else {
          // Não é folha - adicionar chave e continuar recursão
          keys.push(key, fullKey);
          keys.push(...extractAllKeys(value, fullKey));
        }
      }
    }
  } else {
    // Valor primitivo - usar parentKey se existir
    if (parentKey) {
      keys.push(parentKey);
    }
  }
  
  // Remover duplicatas e chaves vazias, priorizar chaves específicas
  const uniqueKeys = [...new Set(keys.filter(key => key && key.length > 1))];
  
  // Ordenar por especificidade (chaves compostas primeiro)
  return uniqueKeys.sort((a, b) => {
    const aDepth = a.split('.').length;
    const bDepth = b.split('.').length;
    return bDepth - aDepth; // Chaves mais específicas primeiro
  });
}

/**
 * Calcula similaridade de Jaccard otimizada para textos.
 * Foca em palavras significativas e normalização inteligente.
 * 
 * @param textA - Primeiro texto (geralmente a chave)
 * @param textB - Segundo texto (chunk do PDF)
 * @returns Valor entre 0 e 1 representando similaridade
 */
function jaccardSimilarity(textA: string, textB: string): number {
  // Normalizar e extrair palavras significativas
  const wordsA = extractSignificantWords(textA);
  const wordsB = extractSignificantWords(textB);
  
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  // Calcular interseção e união
  const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
  const union = new Set([...wordsA, ...wordsB]);
  
  const jaccardIndex = intersection.size / union.size;
  
  // Boost para matches exatos de palavras-chave importantes
  const exactMatches = [...wordsA].filter(word => 
    word.length > 3 && textB.toLowerCase().includes(word)
  );
  
  const boostFactor = 1 + (exactMatches.length * 0.2);
  
  return Math.min(jaccardIndex * boostFactor, 1.0);
}

/**
 * Implementa similaridade estilo Manhattan para textos.
 * Calcula "distância" baseada em frequência de palavras.
 * 
 * @param textA - Primeiro texto (chave)
 * @param textB - Segundo texto (chunk)
 * @returns Valor entre 0 e 1, onde maior = mais similar
 */
function manhattanTextSimilarity(textA: string, textB: string): number {
  const wordsA = extractSignificantWords(textA);
  const wordsB = extractSignificantWords(textB);
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  // Criar frequência de palavras
  const freqA = createWordFrequency(textA);
  const freqB = createWordFrequency(textB);
  
  // Calcular distância Manhattan normalizada
  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let distance = 0;
  let maxPossibleDistance = 0;
  
  for (const word of allWords) {
    const countA = freqA[word] || 0;
    const countB = freqB[word] || 0;
    
    distance += Math.abs(countA - countB);
    maxPossibleDistance += Math.max(countA, countB);
  }
  
  // Converter distância em similaridade
  if (maxPossibleDistance === 0) return 0;
  
  const similarity = 1 - (distance / maxPossibleDistance);
  
  // Aplicar boost para correspondências de palavras-chave importantes
  const keywordBoost = calculateKeywordBoost(wordsA, textB);
  
  return Math.min(similarity + keywordBoost, 1.0);
}

/**
 * Extrai palavras significativas de um texto
 */
function extractSignificantWords(text: string): Set<string> {
  const words = text.toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ') // Manter acentos
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && // Palavras com mais de 2 caracteres
      !/^\d+$/.test(word) && // Não números puros
      !isStopWord(word) // Não palavras vazias
    );
  
  return new Set(words);
}

/**
 * Cria mapa de frequência de palavras
 */
function createWordFrequency(text: string): Record<string, number> {
  const words = extractSignificantWords(text);
  const freq: Record<string, number> = {};
  
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  return freq;
}

/**
 * Calcula boost baseado em palavras-chave importantes
 */
function calculateKeywordBoost(keywords: Set<string>, text: string): number {
  const textLower = text.toLowerCase();
  let boost = 0;
  
  for (const keyword of keywords) {
    if (keyword.length > 3 && textLower.includes(keyword)) {
      boost += 0.1; // 10% boost por palavra-chave importante
    }
  }
  
  return Math.min(boost, 0.3); // Máximo 30% boost
}

/**
 * Lista básica de palavras vazias em português
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre',
    'e', 'ou', 'mas', 'se', 'que', 'como', 'quando', 'onde',
    'é', 'são', 'foi', 'será', 'tem', 'ter', 'estar', 'ser'
  ]);
  
  return stopWords.has(word);
}
