// src/utils/cache/cacheUtils.ts
import crypto from 'crypto';
import { CertificadoConfig } from '../types';

export class CacheUtils {
    /**
     * Gera chave única para o cache baseada nos dados do certificado
     */
    static gerarChaveCache(config: CertificadoConfig): string {
        const dadosUnicos = [
            config.CNPJ || '',
            config.CSCid || '',
            config.tpAmb || 2,
            config.UF || 'SP'
        ].join('_');
        
        return crypto.createHash('md5').update(dadosUnicos).digest('hex');
    }

    /**
     * Mascara dados sensíveis para logs
     */
    static mascararEmpresa(chave: string): string {
        return chave.substring(0, 8) + '***';
    }

    /**
     * Converte timestamp para tempo legível
     */
    static formatarTempo(timestamp: number): string {
        const segundos = Math.round(timestamp / 1000);
        
        if (segundos < 60) return `${segundos}s`;
        if (segundos < 3600) return `${Math.round(segundos / 60)}m`;
        return `${Math.round(segundos / 3600)}h`;
    }

    /**
     * Verifica se entrada do cache ainda é válida
     */
    static isEntradaValida(timestamp: number, ttl: number): boolean {
        return (Date.now() - timestamp) < ttl;
    }

    /**
     * Calcula tempo restante até expiração
     */
    static tempoParaExpirar(timestamp: number, ttl: number): number {
        return Math.max(0, ttl - (Date.now() - timestamp));
    }
}