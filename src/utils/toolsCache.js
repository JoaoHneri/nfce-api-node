import path from 'path';
import { Tools } from 'node-sped-nfe';
import { CacheUtils } from './cacheUtil.js';

export class ToolsCache {
    cache = new Map();
    config;
    cleanupTimer;

    constructor(config) {
        this.config = Object.assign({
            ttl: 30 * 60 * 1000,          // 30 minutos
            maxSize: 100,                  // 100 empresas
            cleanupInterval: 5 * 60 * 1000, // 5 minutos
        }, config);

        this.iniciarLimpezaAutomatica();
    }

    async obterTools(certificadoConfig) {
        const chaveCache = CacheUtils.gerarChaveCache(certificadoConfig);
        const agora = Date.now();

        // Verificar cache
        const cached = this.cache.get(chaveCache);
        
        if (cached && CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
            // Cache HIT
            cached.hits++;
            return cached.tools;
        }

        // Cache MISS - remover se expirado
        if (cached) {
            this.cache.delete(chaveCache);
        }

        // Criar novo Tools
        const tools = await this.criarTools(certificadoConfig);

        // Armazenar no cache
        this.cache.set(chaveCache, {
            tools,
            timestamp: agora,
            hits: 1,
            config: {
                cnpj: certificadoConfig.cnpj?.substring(0, 4) + '***',
                consumer_key_id: certificadoConfig.consumer_key_id,
                environment: certificadoConfig.environment,
                uf: certificadoConfig.uf
            }
        });

        // Controlar tamanho
        this.controlarTamanhoCache();

        return tools;
    }

    async criarTools(certificadoConfig) {
        try {
            const xmllintPath = path.resolve(process.cwd(), 'libs/libxml2-2.9.3-win32-x86_64/bin/xmllint.exe');
            const opensslPath = path.resolve(process.cwd(), 'libs/openssl-3.5.0.win86/bin/openssl.exe');
            const tools = new Tools(
                {
                    mod: "65",
                    tpAmb: certificadoConfig.environment || 2,
                    UF: certificadoConfig.uf || "SP",
                    versao: "4.00",
                    CSC: certificadoConfig.consumer_key,
                    CSCid: certificadoConfig.consumer_key_id,
                    timeout: 10000,
                    xmllint: xmllintPath,
                    openssl: opensslPath,
                    CPF: certificadoConfig.cpf || "",
                    CNPJ: certificadoConfig.cnpj || "",
                },
                {
                    pfx: certificadoConfig.pfxPath,
                    senha: certificadoConfig.password,
                }
            );
            return tools;
        } catch (error) {
            console.error('Error creating Tools:', error);
            throw new Error(`Failed to create Tools: ${error.message}`);
        }
    }

    limparCacheExpirado() {
        const agora = Date.now();
        for (const [chave, cached] of this.cache.entries()) {
            if (!CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
                this.cache.delete(chave);
            }
        }
    }

    controlarTamanhoCache() {
        if (this.cache.size > this.config.maxSize) {
            const entradas = Array.from(this.cache.entries())
                .sort(([,a], [,b]) => {
                    if (a.hits !== b.hits) return a.hits - b.hits;
                    return a.timestamp - b.timestamp;
                });
            const [chaveRemover] = entradas[0];
            this.cache.delete(chaveRemover);
        }
    }

    iniciarLimpezaAutomatica() {
        this.cleanupTimer = setInterval(() => {
            this.limparCacheExpirado();
        }, this.config.cleanupInterval);
    }

    obterEstatisticas() {
        const agora = Date.now();
        const empresas = Array.from(this.cache.entries()).map(([chave, cached]) => ({
            empresa: CacheUtils.mascararEmpresa(chave),
            hits: cached.hits,
            idade: CacheUtils.formatarTempo(agora - cached.timestamp),
            expiraEm: CacheUtils.formatarTempo(CacheUtils.tempoParaExpirar(cached.timestamp, this.config.ttl))
        }));

        return {
            totalEmpresas: this.cache.size,
            maxSize: this.config.maxSize,
            ttlSeconds: Math.round(this.config.ttl / 1000),
            empresas: empresas.sort((a, b) => b.hits - a.hits)
        };
    }

    limparCache() {
        this.cache.clear();
    }

    removerEmpresa(certificadoConfig) {
        const chave = CacheUtils.gerarChaveCache(certificadoConfig);
        return this.cache.delete(chave);
    }

    destruir() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cache.clear();
    }
}