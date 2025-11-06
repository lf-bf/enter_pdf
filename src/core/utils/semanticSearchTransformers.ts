import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Versão com Transformers.js para embeddings locais ultrarrápidos.
 * Utiliza busca semântica combinando similaridade de cossenos e Jaccard
 * para encontrar os chunks mais relevantes do PDF baseado no schema de extração.
 * 
 * @param pdfContent - Conteúdo textual completo do PDF
 * @param extractionSchema - Schema de extração com as chaves que definem quais informações extrair
 * @returns String com os chunks mais relevantes concatenados
 */
export async function semanticSearchTransformers(
  pdfContent: string,
  extractionSchema: any,
): Promise<string> {
  try {
    const startTime = Date.now();
    
    // Import dinâmico do transformers.js
    const { pipeline } = await import('@xenova/transformers');
    
    // Usar modelo de sentence similarity local
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 370, // Chunks bem pequenos para velocidade
      chunkOverlap: 0, // Sem overlap para evitar erro
    });
    
    const chunks = await textSplitter.splitText(pdfContent);
    //const maxChunks = 15; // Muito limitado para velocidade máxima
    //const limitedChunks = chunks.slice(0, maxChunks);
    
    // Gerar embeddings para todos os chunks de uma vez (batch)
    const chunkEmbeddings = await Promise.all(
      chunks.map(async (chunk) => ({
        chunk,
        embedding: await embedder(chunk, { pooling: 'mean', normalize: true })
      }))
    );
    
    // Extrair todas as chaves e sub-chaves recursivamente
    const allKeys = extractAllKeys(extractionSchema);
    const relevantChunks = new Set<string>();
    
    // Para cada chave (incluindo sub-chaves), encontrar chunk mais similar
    for (const key of allKeys) {
      try {
        const keyEmbedding = await embedder(key, { pooling: 'mean', normalize: true });
        
        let bestChunk = '';
        let bestSimilarity = -1;
        
        for (const { chunk, embedding } of chunkEmbeddings) {
          // Similaridade de cossenos (embeddings)
          const cosineScore = cosineSimilarity(Array.from(keyEmbedding.data), Array.from(embedding.data));
          
          // Similaridade de Jaccard (textual)
          const jaccardScore = jaccardSimilarity(key, chunk);
          
          // Score combinado: 70% cosseno + 30% jaccard
          const combinedScore = cosineScore * 0.7 + jaccardScore * 0.3;
          
          if (combinedScore > bestSimilarity) {
            bestSimilarity = combinedScore;
            bestChunk = chunk;
          }
        }
        
        // Threshold ajustado para score combinado
        if (bestChunk && bestSimilarity > 0.3) {
          relevantChunks.add(bestChunk);
        }
      } catch (error) {
        console.warn(`Error processing key "${key}":`, error);
        continue;
      }
    }
    
    // Fallback se não encontrou nada
    if (relevantChunks.size === 0) {
      chunks.slice(0, 2).forEach(chunk => relevantChunks.add(chunk));
    }

    const endTime = Date.now();
    const processingTimeSeconds = (endTime - startTime) / 1000;
    console.log(`Semantic search processing completed in ${processingTimeSeconds.toFixed(2)} seconds`);

    return Array.from(relevantChunks).join('\n\n---\n\n');  } catch (error) {
    console.warn('Transformers.js not available, falling back to local search:', error);
    
    // Fallback para busca local simples usando a mesma lógica de chaves
    return await fallbackLocalSearch(pdfContent, extractionSchema);
  }
}

/**
 * Função de fallback para busca local usando palavras-chave.
 * Utilizada quando o Transformers.js não está disponível, combinando
 * similaridade de Jaccard com score de palavras-chave.
 * 
 * @param pdfContent - Conteúdo textual do PDF
 * @param extractionSchema - Schema com chaves para extração
 * @returns String com chunks relevantes encontrados
 */
async function fallbackLocalSearch(pdfContent: string, extractionSchema: any): Promise<string> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 0,
  });
  
  const chunks = await textSplitter.splitText(pdfContent);
  const maxChunks = 15;
  const limitedChunks = chunks.slice(0, maxChunks);
  
  // Usar a mesma função para extrair todas as chaves
  const allKeys = extractAllKeys(extractionSchema);
  const relevantChunks = new Set<string>();

  // Busca combinando Jaccard e score de palavras-chave
  for (const key of allKeys) {
    let bestChunk = '';
    let bestScore = 0;
    
    for (const chunk of limitedChunks) {
      // Score de Jaccard
      const jaccardScore = jaccardSimilarity(key, chunk);
      
      // Score de palavras-chave (normalizado)
      const keyWords = key.toLowerCase().split(/[._\s]+/).filter(word => word.length > 1);
      const chunkLower = chunk.toLowerCase();
      let keywordScore = 0;
      
      for (const word of keyWords) {
        if (chunkLower.includes(word)) {
          keywordScore += word.length;
        }
      }
      keywordScore = keywordScore / (chunk.length * 0.01); // Normalizar
      
      // Score combinado: 60% Jaccard + 40% keywords
      const combinedScore = jaccardScore * 0.6 + (keywordScore / 100) * 0.4;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestChunk = chunk;
      }
    }
    
    if (bestChunk && bestScore > 0.1) {
      relevantChunks.add(bestChunk);
    }
  }

  // Se não encontrou nada relevante, pega os primeiros chunks
  if (relevantChunks.size === 0) {
    limitedChunks.slice(0, 3).forEach(chunk => relevantChunks.add(chunk));
  }

  return Array.from(relevantChunks).join('\n\n---\n\n');
}

/**
 * Função para extrair todas as chaves e sub-chaves recursivamente do schema.
 * Percorre objetos aninhados e arrays para coletar todos os nomes de campos
 * que serão usados na busca semântica.
 * 
 * @param schema - Schema de extração (objeto, array ou valor primitivo)
 * @param parentKey - Chave pai para construir chaves compostas (opcional)
 * @returns Array com todas as chaves únicas encontradas
 */
function extractAllKeys(schema: any, parentKey = ''): string[] {
  const keys: string[] = [];
  
  if (Array.isArray(schema)) {
    // Se é um array, não há chaves específicas, mas podemos usar o parentKey
    if (parentKey) {
      keys.push(parentKey);
    }
  } else if (typeof schema === 'object' && schema !== null) {
    // Se é um objeto, extrair todas as chaves
    for (const key in schema) {
      if (schema.hasOwnProperty(key)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        
        // Adicionar a chave atual
        keys.push(key);
        keys.push(fullKey);
        
        // Recursivamente extrair sub-chaves
        const subKeys = extractAllKeys(schema[key], fullKey);
        keys.push(...subKeys);
      }
    }
  } else {
    // Se é um valor primitivo e temos parentKey, adicionar
    if (parentKey) {
      keys.push(parentKey);
    }
  }
  
  // Remover duplicatas e chaves vazias
  return [...new Set(keys.filter(key => key && key.length > 0))];
}

/**
 * Calcula a similaridade de cossenos entre dois vetores de embeddings.
 * Mede o ângulo entre vetores, sendo 1.0 = idênticos e 0.0 = ortogonais.
 * 
 * @param vecA - Primeiro vetor de números (embedding)
 * @param vecB - Segundo vetor de números (embedding)
 * @returns Valor entre 0 e 1 representando a similaridade
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) {
    return 0;
  }
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calcula a similaridade de Jaccard entre dois textos.
 * Mede a sobreposição de palavras únicas: |intersecção| / |união|.
 * 
 * @param textA - Primeiro texto para comparação
 * @param textB - Segundo texto para comparação
 * @returns Valor entre 0 e 1, onde 1 significa textos idênticos
 */
function jaccardSimilarity(textA: string, textB: string): number {
  // Normalizar e dividir em palavras únicas
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(word => word.length > 1));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(word => word.length > 1));
  
  // Calcular interseção e união
  const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
  const union = new Set([...wordsA, ...wordsB]);
  
  // Evitar divisão por zero
  return union.size === 0 ? 0 : intersection.size / union.size;
}