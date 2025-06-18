import { Make, Tools } from "node-sped-nfe";
import fs from "fs";
import https from "https";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { NFCeData, CertificadoConfig, SefazResponse, SefazEndpoints, CancelamentoRequest } from '../types';
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO} from '../config/sefaz-endpoints';
import { ConsultaHandler } from "../handlers/consultaHandlers"; 
import { CancelamentoHandler } from "../handlers/cancelamentoHandler";
export class SefazNfceService {
    private tools: Tools;
    private certificadoConfig: CertificadoConfig;
    private consultaHandler: ConsultaHandler;
    private cancelamentoHandler: CancelamentoHandler;

    constructor(certificadoConfig: CertificadoConfig, ambiente: 'homologacao' | 'producao' = 'homologacao') {

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

    // Criar NFCe
    async criarNFCe(dados: NFCeData): Promise<string> {
        const NFe = new Make();

        // Configurar cabeçalho
        NFe.tagInfNFe({ Id: null, versao: '4.00' });

        // Dados de identificação
        NFe.tagIde({
            cUF: dados.ide.cUF,
            cNF: dados.ide.cNF,
            natOp: dados.ide.natOp,
            mod: "65",
            serie: dados.ide.serie,
            nNF: dados.ide.nNF,
            dhEmi: dados.ide.dhEmi || NFe.formatData(),
            tpNF: dados.ide.tpNF,
            idDest: dados.ide.idDest,
            cMunFG: dados.ide.cMunFG,
            tpImp: dados.ide.tpImp,
            tpEmis: dados.ide.tpEmis,
            cDV: "0", // Será calculado automaticamente
            tpAmb: dados.ide.tpAmb,
            finNFe: dados.ide.finNFe,
            indFinal: dados.ide.indFinal,
            indPres: dados.ide.indPres,
            indIntermed: dados.ide.indIntermed || "0",
            procEmi: dados.ide.procEmi,
            verProc: dados.ide.verProc
        });

        // Dados do emitente
        NFe.tagEmit({
            CNPJ: dados.emitente.CNPJ,
            xNome: dados.emitente.xNome,
            xFant: dados.emitente.xFant,
            IE: dados.emitente.IE,
            CRT: dados.emitente.CRT
        });

        // Endereço do emitente
        NFe.tagEnderEmit({
            xLgr: dados.emitente.endereco.xLgr,
            nro: dados.emitente.endereco.nro,
            xBairro: dados.emitente.endereco.xBairro,
            cMun: dados.emitente.endereco.cMun,
            xMun: dados.emitente.endereco.xMun,
            UF: dados.emitente.endereco.UF,
            CEP: dados.emitente.endereco.CEP,
            cPais: dados.emitente.endereco.cPais || "1058",
            xPais: dados.emitente.endereco.xPais || "BRASIL",
            fone: dados.emitente.endereco.fone
        });

        // Destinatário (opcional)
        if (dados.destinatario) {
            NFe.tagDest({
                CPF: dados.destinatario.CPF,
                CNPJ: dados.destinatario.CNPJ,
                xNome: dados.destinatario.xNome,
                indIEDest: dados.destinatario.indIEDest || "9"
            });
        }

        // Produtos
        NFe.tagProd(dados.produtos);

        // Impostos
        dados.produtos.forEach((_, index) => {
            const impostos = dados.impostos || { orig: "0", CSOSN: "400", CST_PIS: "49", CST_COFINS: "49" };

            NFe.tagProdICMSSN(index, { orig: impostos.orig, CSOSN: impostos.CSOSN });
            NFe.tagProdPIS(index, { CST: impostos.CST_PIS, qBCProd: "0.0000", vAliqProd: "0.0000", vPIS: "0.00" });
            NFe.tagProdCOFINS(index, { CST: impostos.CST_COFINS, qBCProd: "0.0000", vAliqProd: "0.0000", vCOFINS: "0.00" });
        });

        // Calcular totais
        NFe.tagICMSTot();

        // Transporte
        if (dados.transporte) {
            NFe.tagTransp({ modFrete: dados.transporte.modFrete });
        } else {
            NFe.tagTransp({ modFrete: "9" }); // Sem ocorrência de transporte
        }

        // Pagamento
        NFe.tagDetPag(dados.pagamento.detPag);

        if (dados.pagamento.vTroco) {
            NFe.tagTroco(dados.pagamento.vTroco);
        }

        return NFe.xml();
    }

    // Assinar XML
    async assinarXML(xml: string): Promise<string> {
        return await this.tools.xmlSign(xml);
    }

    // Enviar para SEFAZ
    async enviarParaSefaz(xmlAssinado: string, uf: string = 'SP', ambiente: 'homologacao' | 'producao' = 'homologacao'): Promise<SefazResponse> {
        try {
            const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
            const urlSefaz = endpoints[uf].nfceAutorizacao;

            const xmlLote = this.criarLoteNFCe(xmlAssinado);
            const resposta = await this.fazerRequisicaoSefaz(urlSefaz, xmlLote);

            return this.processarResposta(resposta);

        } catch (error: any) {
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    // Consultar status do serviço
    async consultarStatusServico(uf: string = 'SP', ambiente: 'homologacao' | 'producao' = 'homologacao'): Promise<SefazResponse> {
        try {
            const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
            const urlStatus = endpoints[uf].nfceStatusServico;
            const xmlConsulta = this.criarXMLStatusServico(uf);
            const resposta = await this.fazerRequisicaoSefaz(urlStatus, xmlConsulta, 'status');

            return this.processarResposta(resposta);

        } catch (error: any) {
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    // Funções auxiliares privadas
    private criarLoteNFCe(xmlNFCe: string): string {
        const idLote = Math.floor(Math.random() * 999999999) + 1;
        const xmlLimpo = this.limparXML(xmlNFCe.replace(/^<\?xml[^>]*\?>\s*/, ''));

        return this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
<enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
<idLote>${idLote}</idLote>
<indSinc>1</indSinc>
${xmlLimpo}
</enviNFe>`);
    }

    private criarXMLStatusServico(uf: string): string {
        const cUF = this.obterCodigoUF(uf);

        return this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<tpAmb>2</tpAmb>
<cUF>${cUF}</cUF>
<xServ>STATUS</xServ>
</consStatServ>`);
    }

    private async fazerRequisicaoSefaz(url: string, xmlDados: string, tipo: 'envio' | 'status' = 'envio'): Promise<string> {
        const soapAction = tipo === 'status'
            ? 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF'
            : 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote';

        const namespace = tipo === 'status'
            ? 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4'
            : 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';

        const soapEnvelope = this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
<soap12:Header>
<nfeCabecMsg xmlns="${namespace}">
<versaoDados>4.00</versaoDados>
<cUF>35</cUF>
</nfeCabecMsg>
</soap12:Header>
<soap12:Body>
<nfeDadosMsg xmlns="${namespace}">${xmlDados.replace(/^<\?xml[^>]*\?>\s*/, '')}</nfeDadosMsg>
</soap12:Body>
</soap12:Envelope>`);

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const certificado = fs.readFileSync(this.certificadoConfig.pfx);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': soapAction,
                    'Content-Length': Buffer.byteLength(soapEnvelope),
                    'User-Agent': 'NFCe-API/1.0'
                },
                pfx: certificado,
                passphrase: this.certificadoConfig.senha,
                rejectUnauthorized: false,
                secureProtocol: 'TLSv1_2_method'
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => reject(error));
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Timeout na requisição'));
            });

            req.write(soapEnvelope);
            req.end();
        });
    }

    private processarResposta(xmlResposta: string): SefazResponse {
        const xmlLimpo = this.extrairXMLdoSOAP(xmlResposta);

        const cStat = xmlLimpo.match(/<cStat>(\d+)<\/cStat>/g);
        const xMotivo = xmlLimpo.match(/<xMotivo>(.*?)<\/xMotivo>/g);
        const chaveAcesso = xmlLimpo.match(/<chNFe>(\d+)<\/chNFe>/)?.[1];
        const protocolo = xmlLimpo.match(/<nProt>(\d+)<\/nProt>/)?.[1];
        const dhRecbto = xmlLimpo.match(/<dhRecbto>(.*?)<\/dhRecbto>/)?.[1];

        const statusNFCe = cStat?.[1]?.match(/\d+/)?.[0];
        const motivoNFCe = xMotivo?.[1]?.match(/>([^<]+)</)?.[1];

        const sucesso = statusNFCe === '100';

        return {
            sucesso,
            cStat: statusNFCe || cStat?.[0]?.match(/\d+/)?.[0],
            xMotivo: motivoNFCe || xMotivo?.[0]?.match(/>([^<]+)</)?.[1],
            chaveAcesso,
            protocolo,
            dataHora: dhRecbto,
            xmlCompleto: xmlLimpo
        };
    }

    private limparXML(xml: string): string {
        return xml
            .trim()
            .replace(/>\s+</g, '><')
            .replace(/\n\s*/g, '')
            .replace(/\t/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s+>/g, '>')
            .replace(/<\s+/g, '<');
    }

    private extrairXMLdoSOAP(soapResponse: string): string {
        const match = soapResponse.match(/<!\[CDATA\[(.*?)\]\]>/s) ||
            soapResponse.match(/<nfeResultMsg[^>]*>(.*?)<\/nfeResultMsg>/s);

        return match && match[1] ? match[1].trim() : soapResponse;
    }

    private obterCodigoUF(uf: string): string {
        const codigos: Record<string, string> = {
            'SP': '35',
            'RJ': '33',
            'MG': '31',
            'BA': '29'
        };
        return codigos[uf] || '35';
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