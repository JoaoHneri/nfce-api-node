// src/utils/cache/cacheTypes.ts
import { Tools } from 'node-sped-nfe';
import { CertificadoConfig } from '.';

export interface CacheEntry {
    tools: Tools;
    timestamp: number;
    hits: number;
    config: Partial<CertificadoConfig>; // Para debug/logs
}

export interface CacheStats {
    totalEmpresas: number;
    maxSize: number;
    ttlSeconds: number;
    empresas: Array<{
        empresa: string;
        hits: number;
        idade: string;
        expiraEm: string;
    }>;
}

export interface CacheConfig {
    ttl: number;           // Time to live em ms
    maxSize: number;       // Máximo de entradas
    cleanupInterval: number; // Intervalo de limpeza em ms
}