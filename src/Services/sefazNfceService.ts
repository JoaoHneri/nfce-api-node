import { Make, Tools } from "node-sped-nfe";
import fs from "fs";
import https from "https";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { NFCeData, CertificadoConfig, SefazResponse, SefazEndpoints, CancelamentoRequest } from '../types';
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO} from '../config/sefaz-endpoints';
import { ConsultaHandler } from "../handlers/nfceHandlers/consultaNfceHandlers";
import { CancelamentoHandler } from "../handlers/nfceHandlers/cancelamentoHandler";
import { EmissaoNfceHandler } from "../handlers/nfceHandlers/emissaoNfceHandler";
import { ToolsCache } from "../utils/toolsCache";

export class SefazNfceService {
    private emissaoHandler: EmissaoNfceHandler;
    private consultaHandler: ConsultaHandler;
    private cancelamentoHandler: CancelamentoHandler;
     private toolsCache: ToolsCache;

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


    async emitirNFCe(dados: NFCeData, certificadoConfig: CertificadoConfig): Promise<SefazResponse> {
        const tools = await this.toolsCache.obterTools(certificadoConfig);
        return await this.emissaoHandler.emitirNFCe(tools, this.carregarConfigCertificado(certificadoConfig), dados);
    }

    async consultarNFCe(chave: string, certificadoConfig: CertificadoConfig) {
        const tools = await this.toolsCache.obterTools(certificadoConfig);
        return await this.consultaHandler.consultarNFCe(tools, chave);
    }

    async cancelarNFCe(dados: CancelamentoRequest, certificadoConfig: CertificadoConfig) {
        const tools = await this.toolsCache.obterTools(certificadoConfig);
        return await this.cancelamentoHandler.cancelarNFCe(tools, this.carregarConfigCertificado(certificadoConfig), dados);
    }

    private carregarConfigCertificado(certificadoConfig: CertificadoConfig): CertificadoConfig {

            return {
                pfxPath: certificadoConfig.pfxPath || '',
                password: certificadoConfig.password || '',
                csc: certificadoConfig.csc || '',
                cscId: certificadoConfig.cscId || '',
                cnpj: certificadoConfig.cnpj || '',
                cpf: certificadoConfig.cpf || '',
                environment: certificadoConfig.environment || 2, // 1 para produção, 2 para homologação
                uf: certificadoConfig.uf || '', // Sigla do estado, ex: 'SP', 'RJ'
            };
    }

    public obterEstatisticasCache() {
        return this.toolsCache.obterEstatisticas();
    }

    public limparCache() {
        this.toolsCache.limparCache();
    }

    public async obterTools(certificadoConfig: CertificadoConfig) {
        return await this.toolsCache.obterTools(certificadoConfig);
    }
}