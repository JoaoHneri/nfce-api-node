// src/utils/cache/cacheUtils.ts
import * as crypto from 'crypto';
import { CertificadoConfigDto } from '../dto';

export class CacheUtils {
  static gerarChaveCache(config: CertificadoConfigDto): string {
    const dadosUnicos = [
      config.CNPJ || '',
      config.CSCid || '',
      config.tpAmb || 2,
      config.UF || 'SP',
    ].join('_');

    return crypto.createHash('md5').update(dadosUnicos).digest('hex');
  }

  static mascararEmpresa(chave: string): string {
    return chave.substring(0, 8) + '***';
  }

  static formatarTempo(timestamp: number): string {
    const segundos = Math.round(timestamp / 1000);

    if (segundos < 60) return `${segundos}s`;
    if (segundos < 3600) return `${Math.round(segundos / 60)}m`;
    return `${Math.round(segundos / 3600)}h`;
  }

  static isEntradaValida(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
  }

  static tempoParaExpirar(timestamp: number, ttl: number): number {
    return Math.max(0, ttl - (Date.now() - timestamp));
  }
}
