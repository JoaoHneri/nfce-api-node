import { ConsultaHandler } from "../handlers/nfceHandlers/consultaNfceHandlers.js";
import { CancelamentoHandler } from "../handlers/nfceHandlers/cancelamentoHandler.js";
import { EmissaoNfceHandler } from "../handlers/nfceHandlers/emissaoNfceHandler.js";
import { ToolsCache } from "../utils/toolsCache.js";

export class SefazNfceService {
    constructor() {
        this.emissaoHandler = new EmissaoNfceHandler();
        this.consultaHandler = new ConsultaHandler();
        this.cancelamentoHandler = new CancelamentoHandler();
        this.toolsCache = new ToolsCache({
            ttl: 30 * 60 * 1000,     // 30 minutos
            maxSize: 100,            // 100 empresas
            cleanupInterval: 5 * 60 * 1000 // 5 minutos
        });
    }

    async emitirNFCe(company, certificate, nfceData) {
        const tools = await this.toolsCache.obterTools(certificate);
        return await this.emissaoHandler.processarEmissaoCompleta(company, certificate, nfceData, tools);
    }

    async consultarNFCe(chave, certificadoConfig) {
        const tools = await this.toolsCache.obterTools(certificadoConfig);
        return await this.consultaHandler.consultarNfce(tools, chave);
    }

    async cancelarNFCe(dados, certificadoConfig) {
        const tools = await this.toolsCache.obterTools(certificadoConfig);
        return await this.cancelamentoHandler.cancelarNFCe(tools, this.carregarConfigCertificado(certificadoConfig), dados);
    }

    carregarConfigCertificado(certificadoConfig) {
        return {
            pfxPath: certificadoConfig.pfxPath || '',
            password: certificadoConfig.password || '',
            consumer_key: certificadoConfig.consumer_key || '',
            consumer_key_id: certificadoConfig.consumer_key_id || '',
            cnpj: certificadoConfig.cnpj || '',
            cpf: certificadoConfig.cpf || '',
            environment: certificadoConfig.environment || 2, // 1 para produção, 2 para homologação
            uf: certificadoConfig.uf || '', // Sigla do estado, ex: 'SP', 'RJ'
        };
    }

    obterEstatisticasCache() {
        return this.toolsCache.obterEstatisticas();
    }

    limparCache() {
        this.toolsCache.limparCache();
    }

    async obterTools(certificadoConfig) {
        return await this.toolsCache.obterTools(certificadoConfig);
    }
}

