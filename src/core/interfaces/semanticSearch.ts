/**
 * Configuração de algoritmos para parsing local de PDFs
 */
export interface LocalParsingConfig {
  algorithms: 'jaccard' | 'manhattan' | 'both';
  chunkSize?: number;
  threshold?: number;
  maxChunks?: number;
}

/**
 * Resultado individual do parsing com informações de score e algoritmo
 */
export interface ParseResult {
  chunk: string;
  score: number;
  algorithm: 'jaccard' | 'manhattan';
  key: string;
}

/**
 * Configuração para processamento de chaves do schema
 */
export interface KeyProcessingConfig {
  includeCompositeKeys?: boolean;
  prioritizeLeaves?: boolean;
  specificityWeight?: number;
}

export interface KeyProcessingResult {
  key: string;
  results: ParseResult[];
  maxScore: number;
  bestAlgorithm: 'jaccard' | 'manhattan';
}

/**
 * Estatísticas do processamento local
 */
export interface LocalParsingStats {
  processingTimeSeconds: number;
  keysProcessed: number;
  chunksAnalyzed: number;
  resultsFound: number;
  uniqueChunksSelected: number;
  algorithmsUsed: string[];
}
