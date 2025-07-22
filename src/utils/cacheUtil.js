// src/utils/cache/cacheUtils.js
import crypto from 'crypto';

export class CacheUtils {

    static gerarChaveCache(config) {
        const dadosUnicos = [
            config.cnpj || '',
            config.consumer_key_id || '',
            config.environment || 2,
            config.uf || 'SP'
        ].join('_');
        
        return crypto.createHash('md5').update(dadosUnicos).digest('hex');
    }

    static mascararEmpresa(chave) {
        return chave.substring(0, 8) + '***';
    }

    static formatarTempo(timestamp) {
        const segundos = Math.round(timestamp / 1000);
        
        if (segundos < 60) return `${segundos}s`;
        if (segundos < 3600) return `${Math.round(segundos / 60)}m`;
        return `${Math.round(segundos / 3600)}h`;
    }

    static isEntradaValida(timestamp, ttl) {
        return (Date.now() - timestamp) < ttl;
    }

    static tempoParaExpirar(timestamp, ttl) {
        return Math.max(0, ttl - (Date.now() - timestamp));
    }
}
