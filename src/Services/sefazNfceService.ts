import { Make, Tools } from "node-sped-nfe";
import fs from "fs";
import https from "https";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { NFCeData, CertificadoConfig, SefazResponse, SefazEndpoints, CancelamentoRequest } from '../types';
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO} from '../config/sefaz-endpoints';
import { ConsultaHandler } from "../handlers/consultaNfceHandlers";
import { CancelamentoHandler } from "../handlers/cancelamentoHandler";
import { EmissaoNfceHandler } from "../handlers/emissaoNfceHandler";
export class SefazNfceService {
    private emissaoHandler: EmissaoNfceHandler;
    private consultaHandler: ConsultaHandler;
    private cancelamentoHandler: CancelamentoHandler;

    constructor() {
        this.emissaoHandler = new EmissaoNfceHandler();
        this.consultaHandler = new ConsultaHandler();
        this.cancelamentoHandler = new CancelamentoHandler();
    }


    async emitirNFCe(dados: NFCeData, certificadoConfig: CertificadoConfig): Promise<SefazResponse> {
        const tools = this.criarTools(certificadoConfig);
        return await this.emissaoHandler.emitirNFCe(tools, this.carregarConfigCertificado(certificadoConfig), dados);
    }

    async consultarNFCe(chave: string, certificadoConfig: CertificadoConfig) {
        const tools = this.criarTools(certificadoConfig);
        return await this.consultaHandler.consultarNFCe(tools, chave);
    }

    async cancelarNFCe(dados: CancelamentoRequest, certificadoConfig: CertificadoConfig) {
        const tools = this.criarTools(certificadoConfig);
        return await this.cancelamentoHandler.cancelarNFCe(tools, this.carregarConfigCertificado(certificadoConfig), dados);
    }

    private criarTools(certificadoConfig: CertificadoConfig) {
        return new Tools(
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
    }
    
    private carregarConfigCertificado(certificadoConfig: CertificadoConfig): CertificadoConfig {
            console.log('🔑 Carregando configuração do certificado...')

            return {
                pfx: certificadoConfig.pfx || '',
                senha: certificadoConfig.senha || '',
                CSC: certificadoConfig.CSC || '',
                CSCid: certificadoConfig.CSCid || '',
                CNPJ: certificadoConfig.CNPJ || '',
                CPF: certificadoConfig.CPF || '',
                tpAmb: certificadoConfig.tpAmb || 2, // 1 para produção, 2 para homologação
                UF: certificadoConfig.UF || '', // Sigla do estado, ex: 'SP', 'RJ'
            };
    }


}