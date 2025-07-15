import { Tools } from 'node-sped-nfe';
import { CertificadoConfig } from '../types';
import { CacheEntry, CacheConfig, CacheStats } from '../types/cacheTypes';
import { CacheUtils } from './cacheUtil';

export class ToolsCache {
    private cache: Map<string, CacheEntry> = new Map();
    private config: CacheConfig;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config?: Partial<CacheConfig>) {
        this.config = {
            ttl: 30 * 60 * 1000,          // 30 minutos
            maxSize: 100,                  // 100 empresas
            cleanupInterval: 5 * 60 * 1000, // 5 minutos
            ...config
        };

        this.iniciarLimpezaAutomatica();
    }

    async obterTools(certificadoConfig: CertificadoConfig): Promise<Tools> {
        const chaveCache = CacheUtils.gerarChaveCache(certificadoConfig);
        const agora = Date.now();

        // Verificar cache
        const cached = this.cache.get(chaveCache);
        
        if (cached && CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
            // Cache HIT
            cached.hits++;
            const idade = CacheUtils.formatarTempo(agora - cached.timestamp);
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

    private async criarTools(certificadoConfig: CertificadoConfig): Promise<Tools> {
        const inicio = Date.now();
        
        try {
            const tools = new Tools(
                {
                    mod: "65",
                    tpAmb: certificadoConfig.environment || 2,
                    UF: certificadoConfig.uf || "SP",
                    versao: "4.00",
                    CSC: certificadoConfig.consumer_key,
                    CSCid: certificadoConfig.consumer_key_id,
                    timeout: 10000,
                    xmllint: `C:/Users/joaoh/Downloads/windowsLibs/libs/libxml2-2.9.3-win32-x86_64/bin/xmllint.exe`,
                    openssl: "C:/Users/joaoh/Downloads/windowsLibs/libs/openssl-3.5.0.win86/bin/openssl.exe" as any,
                    CPF: certificadoConfig.cpf || "",
                    CNPJ: certificadoConfig.cnpj || "",
                },
                {
                    pfx: certificadoConfig.pfxPath,
                    senha: certificadoConfig.password,
                }
            );

            const tempo = Date.now() - inicio;
            
            return tools;

        } catch (error: any) {
            console.error('Error creating Tools:', error);
            throw new Error(`Failed to create Tools: ${error.message}`);
        }
    }

    private limparCacheExpirado(): void {
        const agora = Date.now();
        let removidos = 0;

        for (const [chave, cached] of this.cache.entries()) {
            if (!CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
                this.cache.delete(chave);
                removidos++;
            }
        }

    }

    private controlarTamanhoCache(): void {
        if (this.cache.size > this.config.maxSize) {
            // Remover a entrada com menos hits e mais antiga
            const entradas = Array.from(this.cache.entries())
                .sort(([,a], [,b]) => {
                    // Primeiro por hits (menos usado)
                    if (a.hits !== b.hits) return a.hits - b.hits;
                    // Depois por idade (mais antigo)
                    return a.timestamp - b.timestamp;
                });
            
            const [chaveRemover] = entradas[0];
            this.cache.delete(chaveRemover);
            
        }
    }

    private iniciarLimpezaAutomatica(): void {
        this.cleanupTimer = setInterval(() => {
            this.limparCacheExpirado();
        }, this.config.cleanupInterval);
    }

    public obterEstatisticas(): CacheStats {
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
            empresas: empresas.sort((a, b) => b.hits - a.hits) // Ordenar por hits
        };
    }

    public limparCache(): void {
        const tamanhoAnterior = this.cache.size;
        this.cache.clear();
    }

    public removerEmpresa(certificadoConfig: CertificadoConfig): boolean {
        const chave = CacheUtils.gerarChaveCache(certificadoConfig);
        const removido = this.cache.delete(chave);
        

        return removido;
    }

    public destruir(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cache.clear();
    }
}