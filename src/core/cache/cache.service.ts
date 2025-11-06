import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 3600 * 1000; // 1 hora em milliseconds

  constructor() {
    // Inicia limpeza automática a cada 30 minutos
    this.startPeriodicCleanup(30);
  }

  /**
   * Gera uma chave de cache baseada no hash do conteúdo PDF, schema e label
   */
  generateCacheKey(pdfContent: string, schema: any, label: string): string {
    const combinedContent = `${pdfContent}${JSON.stringify(schema)}${label}`;
    return crypto.createHash('sha256').update(combinedContent).digest('hex');
  }

  /**
   * Busca um item no cache
   */
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verifica se o item expirou
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Armazena um item no cache
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Remove um item específico do cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Limpa itens expirados do cache (garbage collection)
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Inicia limpeza automática periódica
   */
  startPeriodicCleanup(intervalMinutes = 30): void {
    setInterval(() => {
      this.cleanup();
    }, intervalMinutes * 60 * 1000);
  }
}