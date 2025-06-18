import { Tools } from 'node-sped-nfe';
import { CertificadoConfig } from '../types';
import { CacheEntry, CacheConfig, CacheStats } from '../types/cacheTypes';
import { CacheUtils } from './cacheUtils';

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
        console.log('🚀 ToolsCache inicializado:', this.config);
    }

    /**
     * Obtém Tools do cache ou cria novo se necessário
     */
    async obterTools(certificadoConfig: CertificadoConfig): Promise<Tools> {
        const chaveCache = CacheUtils.gerarChaveCache(certificadoConfig);
        const agora = Date.now();

        console.log(`🔍 Buscando Tools no cache: ${CacheUtils.mascararEmpresa(chaveCache)}`);

        // Verificar cache
        const cached = this.cache.get(chaveCache);
        
        if (cached && CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
            // Cache HIT
            cached.hits++;
            const idade = CacheUtils.formatarTempo(agora - cached.timestamp);
            console.log(`♻️ Cache HIT! Hits: ${cached.hits}, Idade: ${idade}`);
            return cached.tools;
        }

        // Cache MISS - remover se expirado
        if (cached) {
            console.log(`⏰ Cache expirado, removendo...`);
            this.cache.delete(chaveCache);
        }

        // Criar novo Tools
        console.log(`🔧 Cache MISS - criando novo Tools...`);
        const tools = await this.criarTools(certificadoConfig);

        // Armazenar no cache
        this.cache.set(chaveCache, {
            tools,
            timestamp: agora,
            hits: 1,
            config: {
                CNPJ: certificadoConfig.CNPJ?.substring(0, 4) + '***',
                CSCid: certificadoConfig.CSCid,
                tpAmb: certificadoConfig.tpAmb,
                UF: certificadoConfig.UF
            }
        });

        // Controlar tamanho
        this.controlarTamanhoCache();

        console.log(`💾 Tools armazenado no cache. Total: ${this.cache.size}/${this.config.maxSize}`);
        return tools;
    }

    /**
     * Cria nova instância Tools
     */
    private async criarTools(certificadoConfig: CertificadoConfig): Promise<Tools> {
        const inicio = Date.now();
        
        try {
            const tools = new Tools(
                {
                    mod: "65",
                    tpAmb: certificadoConfig.tpAmb || 2,
                    UF: certificadoConfig.UF || "SP",
                    versao: "4.00",
                    CSC: certificadoConfig.CSC,
                    CSCid: certificadoConfig.CSCid,
                    timeout: 10000,
                    xmllint: `C:/Users/joaoh/Downloads/windowsLibs/libs/libxml2-2.9.3-win32-x86_64/bin/xmllint.exe`,
                    openssl: "C:/Users/joaoh/Downloads/windowsLibs/libs/openssl-3.5.0.win86/bin/openssl.exe" as any,
                    CPF: certificadoConfig.CPF || "",
                    CNPJ: certificadoConfig.CNPJ || "",
                },
                {
                    pfx: certificadoConfig.pfx,
                    senha: certificadoConfig.senha,
                }
            );

            const tempo = Date.now() - inicio;
            console.log(`⚡ Tools criado em ${tempo}ms`);
            
            return tools;

        } catch (error: any) {
            console.error('❌ Erro ao criar Tools:', error);
            throw new Error(`Falha ao criar Tools: ${error.message}`);
        }
    }

    /**
     * Remove entradas expiradas do cache
     */
    private limparCacheExpirado(): void {
        const agora = Date.now();
        let removidos = 0;

        for (const [chave, cached] of this.cache.entries()) {
            if (!CacheUtils.isEntradaValida(cached.timestamp, this.config.ttl)) {
                this.cache.delete(chave);
                removidos++;
            }
        }

        if (removidos > 0) {
            console.log(`🗑️ Cache: ${removidos} entradas expiradas removidas. Restam: ${this.cache.size}`);
        }
    }

    /**
     * Controla tamanho máximo do cache
     */
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
            
            console.log(`📏 Cache cheio - entrada menos usada removida. Tamanho: ${this.cache.size}`);
        }
    }

    /**
     * Inicia limpeza automática periódica
     */
    private iniciarLimpezaAutomatica(): void {
        this.cleanupTimer = setInterval(() => {
            this.limparCacheExpirado();
        }, this.config.cleanupInterval);
    }

    /**
     * Obtém estatísticas do cache
     */
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

    /**
     * Limpa todo o cache manualmente
     */
    public limparCache(): void {
        const tamanhoAnterior = this.cache.size;
        this.cache.clear();
        console.log(`🧹 Cache limpo manualmente. ${tamanhoAnterior} entradas removidas.`);
    }

    /**
     * Remove entrada específica do cache
     */
    public removerEmpresa(certificadoConfig: CertificadoConfig): boolean {
        const chave = CacheUtils.gerarChaveCache(certificadoConfig);
        const removido = this.cache.delete(chave);
        
        if (removido) {
            console.log(`🗑️ Empresa removida do cache: ${CacheUtils.mascararEmpresa(chave)}`);
        }
        
        return removido;
    }

    /**
     * Destrói o cache e para a limpeza automática
     */
    public destruir(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cache.clear();
        console.log('💥 ToolsCache destruído');
    }
}