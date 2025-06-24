// src/utils/cache/cacheTypes.ts
import { Tools } from 'node-sped-nfe';
import { CertificadoConfigDto } from '../dto';

export interface CacheEntry {
  tools: Tools;
  timestamp: number;
  hits: number;
  config: Partial<CertificadoConfigDto>; // Para debug/logs
}

export interface CacheConfig {
  ttl: number; // Time to live em ms
  maxSize: number; // Máximo de entradas
  cleanupInterval: number; // Intervalo de limpeza em ms
}
