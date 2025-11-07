export class ExtractionResponseDto {
  /**
   * Dados extraídos do PDF de acordo com o schema fornecido
   */
  data: Record<string, any>;

  /**
   * Informações sobre o cache
   */
  cache: {
    /**
     * Se o resultado veio do cache (true) ou foi processado pelo LLM (false)
     */
    hit: boolean;
    
    /**
     * Chave de cache utilizada (primeiros 16 caracteres)
     */
    key?: string;
    
    /**
     * Timestamp de quando foi armazenado no cache
     */
    cachedAt?: string;
  };

  /**
   * Métricas de performance
   */
  performance: {
    /**
     * Tempo total de processamento em segundos
     */
    executionTime: number;
    
    /**
     * ID único da requisição
     */
    requestId: string;
    
    /**
     * Timestamp da requisição
     */
    timestamp: string;
  };

  /**
   * Informações sobre o documento processado
   */
  document: {
    /**
     * Tipo do documento (label)
     */
    type: string;
    
    /**
     * Quantidade de campos no schema
     */
    schemaFields: number;
  };
}
