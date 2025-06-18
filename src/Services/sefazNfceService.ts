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
    private tools: Tools;
    private emissaoHandler: EmissaoNfceHandler;
    private certificadoConfig: CertificadoConfig;
    private consultaHandler: ConsultaHandler;
    private cancelamentoHandler: CancelamentoHandler;

    constructor(certificadoConfig: CertificadoConfig, ambiente: 'homologacao' | 'producao' = 'homologacao') {
        this.emissaoHandler = new EmissaoNfceHandler();
        this.certificadoConfig = certificadoConfig;
        this.consultaHandler = new ConsultaHandler();
        this.cancelamentoHandler = new CancelamentoHandler();
        
        this.tools = new Tools(
            {
                //Configuração de habiente e sistema
                mod: "65",
                tpAmb: 2,
                UF: "SP",
                versao: "4.00",
                CSC: certificadoConfig.CSC,
                CSCid: certificadoConfig.CSCid,
                timeout: 10000, //10 segundos
                // Optativo: Leia sobre Requisitos.
                xmllint: `C:/Users/joaoh/Downloads/windowsLibs/libs/libxml2-2.9.3-win32-x86_64/bin/xmllint.exe`,
                openssl: "C:/Users/joaoh/Downloads/windowsLibs/libs/openssl-3.5.0.win86/bin/openssl.exe" as any, // ou qualquer string válida
                CPF: "",
                CNPJ: certificadoConfig.CNPJ || "",
            },
            {
                //Certificado digital
                pfx: certificadoConfig.pfx, // Buffer | String
                senha: certificadoConfig.senha,
            }
        );
    }

    // Criar NFCe~
    async emitirNFCe(dados: NFCeData): Promise<SefazResponse> {
        return await this.emissaoHandler.emitirNFCe(this.tools, this.certificadoConfig, dados);
    }

    // Consultar status do serviço
    async consultarStatusServico(uf: string = 'SP', ambiente: 'homologacao' | 'producao' = 'homologacao'): Promise<SefazResponse> {
        
        return await this.emissaoHandler.consultarStatusServico(this.certificadoConfig, uf, ambiente);
    }


    // Salvar arquivos para debug
    async salvarArquivo(conteudo: string, nome: string): Promise<string> {
        const pastaDebug = path.join(process.cwd(), 'debug');

        if (!fs.existsSync(pastaDebug)) {
            fs.mkdirSync(pastaDebug, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivo = `${nome}_${timestamp}.xml`;
        const caminhoCompleto = path.join(pastaDebug, nomeArquivo);

        fs.writeFileSync(caminhoCompleto, conteudo, { encoding: 'utf-8' });

        return caminhoCompleto;
    }

    async consultarNFCe(chave: string) {
        return await this.consultaHandler.consultarNFCe(this.tools, chave);
    }

    async cancelarNFCe(dados: CancelamentoRequest) {
        return await this.cancelamentoHandler.cancelarNFCe(this.tools, this.certificadoConfig, dados);
    }
}