// src/handlers/emissaoNfceHandler.ts
import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { NFCeData, CertificadoConfig, SefazResponse } from "../types";
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../config/sefaz-endpoints';
import { obterConfigSOAP, obterNamespaceSOAP } from '../config/soap-config';
import { SoapHeadersUtil } from "../utils/soapHeadersUtil";
import { TributacaoService } from "../Services/tributacaoService";
import { Make } from "node-sped-nfe";
import https from 'https';
import fs from 'fs';
import path from 'path';

export class EmissaoNfceHandler {
    private parser: SefazResponseParser;

    constructor() {
        this.parser = new SefazResponseParser();
    }

    async emitirNFCe(tools: any, certificadoConfig: CertificadoConfig, dados: NFCeData): Promise<SefazResponse> {
        try {

            const xmlNFCe = await this.criarXMLNFCe(dados);

            await this.salvarArquivoDebug(xmlNFCe, 'nfce_original');

            const xmlAssinado = await tools.xmlSign(xmlNFCe);

            await this.salvarArquivoDebug(xmlAssinado, 'nfce_assinado');

            const xmlResponse = await this.enviarParaSefaz(xmlAssinado, certificadoConfig, dados);

            await this.salvarArquivoDebug(xmlResponse, 'sefaz_resposta');

            return this.processarResposta(xmlResponse);

        } catch (error: any) {
            console.error('Error in issuance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private async criarXMLNFCe(dados: NFCeData): Promise<string> {
        const NFe = new Make();

        NFe.tagInfNFe({ Id: null, versao: '4.00' });

        NFe.tagIde({
            cUF: dados.ide.cUF,
            cNF: dados.ide.cNF,
            natOp: dados.ide.natOp,
            mod: "65",
            serie: dados.ide.serie,
            nNF: dados.ide.nNF,
            dhEmi: NFe.formatData(),
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

        // Issuer data
        NFe.tagEmit({
            CNPJ: dados.issuer.CNPJ,
            xNome: dados.issuer.xNome,
            xFant: dados.issuer.xFant,
            IE: dados.issuer.IE,
            CRT: dados.issuer.CRT
        });

        // Issuer address
        NFe.tagEnderEmit({
            xLgr: dados.issuer.address.xLgr,
            nro: dados.issuer.address.nro,
            xBairro: dados.issuer.address.xBairro,
            cMun: dados.issuer.address.cMun,
            xMun: dados.issuer.address.xMun,
            UF: dados.issuer.address.UF,
            CEP: dados.issuer.address.CEP,
            cPais: dados.issuer.address.cPais || "1058",
            xPais: dados.issuer.address.xPais || "BRASIL",
            fone: dados.issuer.address.fone
        });

        // Recipient (optional)
        if (dados.recipient) {
            NFe.tagDest({
                CPF: dados.recipient.CPF,
                CNPJ: dados.recipient.CNPJ,
                xNome: dados.recipient.xNome,
                indIEDest: dados.recipient.indIEDest || "9"
            });
        }

        // Products
        NFe.tagProd(dados.products);

        dados.products.forEach((produto, index) => {
            const impostos = dados.taxes || { 
                orig: "0", 
                CSOSN: "400", 
                CST_PIS: "49", 
                CST_COFINS: "49" 
            };

            // ICMS (sempre igual - não mudou)
            NFe.tagProdICMSSN(index, { 
                orig: impostos.orig, 
                CSOSN: impostos.CSOSN
            });

            // Obter alíquotas baseado no regime da empresa e CST
            const aliquotas = TributacaoService.obterAliquotas(
                dados.issuer.CRT,           // "1" = Simples Nacional ou outro CRT
                impostos.CST_PIS            // "49" = Outras operações ou outro CST
            );

            // Calcular PIS automaticamente
            const dadosPIS = TributacaoService.calcularPIS(
                parseFloat(produto.vProd),  // Valor do produto
                aliquotas,                  // Alíquotas determinadas
                impostos.CST_PIS           // CST informado
            );
            
            NFe.tagProdPIS(index, dadosPIS);

            // Calcular COFINS automaticamente
            const dadosCOFINS = TributacaoService.calcularCOFINS(
                parseFloat(produto.vProd),  // Valor do produto
                aliquotas,                  // Alíquotas determinadas
                impostos.CST_COFINS        // CST informado
            );
            
            NFe.tagProdCOFINS(index, dadosCOFINS);
        });

        // Calcular totais
        NFe.tagICMSTot();

        // Transport
        if (dados.transport) {
            NFe.tagTransp({ modFrete: dados.transport.modFrete });
        } else {
            NFe.tagTransp({ modFrete: "9" }); // No transport occurrence
        }

        // Payment
        NFe.tagDetPag(dados.payment.detPag);

        if (dados.payment.vTroco) {
            NFe.tagTroco(dados.payment.vTroco);
        }

        if (dados.technicalResponsible) {
            NFe.tagInfRespTec({
                CNPJ: dados.technicalResponsible.CNPJ, xContato: dados.technicalResponsible.xContato, email: dados.technicalResponsible.email, fone: dados.technicalResponsible.fone,
            });
        }


        return NFe.xml();
    }

    private async enviarParaSefaz(xmlAssinado: string, certificadoConfig: CertificadoConfig, dados: NFCeData): Promise<string> {
        try {
            const uf = dados.issuer.address.UF;
            const cUF = dados.ide.cUF;
            const tpAmb = certificadoConfig.tpAmb || 2; // 1 - Produção, 2 - Homologação
            const ambiente = tpAmb === 1 ? 'producao' : 'homologacao';
            const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
            const url = endpoints[uf]?.nfceAutorizacao;

            if (!url) {
                throw new Error(`Endpoint de autorização não configurado para UF: ${uf}`);
            }

            const xmlLote = this.criarLoteNFCe(xmlAssinado);
            const soapEnvelope = this.criarSOAPEnvelope(xmlLote, cUF);

            await this.salvarArquivoDebug(soapEnvelope, 'soap_envelope');

            if (!certificadoConfig.pfx || !certificadoConfig.password) {
                throw new Error('Certificado não configurado adequadamente');
            }

            if (!fs.existsSync(certificadoConfig.pfx)) {
                throw new Error(`Arquivo de certificado não encontrado: ${certificadoConfig.pfx}`);
            }

            const certificado = fs.readFileSync(certificadoConfig.pfx);

            return new Promise((resolve, reject) => {
                try {
                    const urlObj = new URL(url);

                    // 🚀 Headers específicos por estado
                    const headers = SoapHeadersUtil.obterCabecalhosEmissaoPorEstado(uf, soapEnvelope);

                    const options = {
                        hostname: urlObj.hostname,
                        port: urlObj.port || 443,
                        path: urlObj.pathname,
                        method: 'POST',
                        headers,
                        pfx: certificado,
                        passphrase: certificadoConfig.password,
                        rejectUnauthorized: false,
                        secureProtocol: 'TLSv1_2_method'
                    };


                    const req = https.request(options, (res) => {
                        try {

                            let data = '';
                            res.on('data', (chunk) => {
                                data += chunk.toString();
                            });

                            res.on('end', () => {
                                try {

                                    // 🚨 Verificar se é erro HTTP
                                    if (res.statusCode && res.statusCode >= 400) {
                                        // Salvar resposta de erro para debug
                                        this.salvarArquivoDebug(data, `erro_http_${res.statusCode}`);
                                        
                                        reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
                                        return;
                                    }

                                    // 🚨 Verificar se contém erro de media type
                                    if (data.includes('media type is unsupported') || 
                                        data.includes('Content-Type') || 
                                        data.includes('unsupported')) {
                                        
                                        this.salvarArquivoDebug(data, 'erro_content_type');
                                        reject(new Error(`Erro de Content-Type: ${data}`));
                                        return;
                                    }

                                    try {
                                        const xmlLimpo = this.extrairXMLdoSOAP(data);
                                        resolve(xmlLimpo);
                                    } catch (xmlError) {
                                        resolve(data);
                                    }
                                } catch (endError) {
                                    console.error(`Erro no processamento final:`, endError);
                                    reject(endError);
                                }
                            });

                            res.on('error', (resError) => {
                                console.error(`Erro na resposta:`, resError);
                                reject(resError);
                            });

                        } catch (responseError) {
                            console.error(`Erro ao processar resposta:`, responseError);
                            reject(responseError);
                        }
                    });

                    req.on('error', (err) => {
                        console.error(`❌ Erro na requisição HTTPS:`, err);
                        console.error(`🔍 Detalhes do erro:`, {
                            code: (err as any).code,
                            message: err.message,
                            stack: err.stack
                        });
                        reject(err);
                    });

                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('Timeout na requisição de autorização (30s)'));
                    });

                    req.setTimeout(30000);

                    req.write(soapEnvelope);
                    req.end();

                } catch (promiseError) {
                    console.error(`❌ Erro na Promise:`, promiseError);
                    reject(promiseError);
                }
            });

        } catch (methodError) {
            throw methodError;
        }
    }

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

    private criarSOAPEnvelope(xmlLote: string, cUF: string): string {
        const config = obterConfigSOAP(cUF, 'autorizacao');
        const soapNamespace = obterNamespaceSOAP(config.protocoloSOAP);

        const xmlSemDeclaracao = xmlLote.replace(/^<\?xml[^>]*\?>\s*/, '');

        return this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
        <${config.envelopePrefixo}:Envelope xmlns:${config.envelopePrefixo}="${soapNamespace}">
        <${config.envelopePrefixo}:Header>
            <nfeCabecMsg xmlns="${config.namespaceCabecalho}">
            <versaoDados>4.00</versaoDados>
            <cUF>${cUF}</cUF>
            </nfeCabecMsg>
        </${config.envelopePrefixo}:Header>
        <${config.envelopePrefixo}:Body>
            <${config.tagMsg} ${config.xmlnsTagMsg}>
            ${xmlSemDeclaracao}
            </${config.tagMsg}>
        </${config.envelopePrefixo}:Body>
        </${config.envelopePrefixo}:Envelope>`);
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

        const success = statusNFCe === '100';

        return {
            success,
            cStat: statusNFCe || cStat?.[0]?.match(/\d+/)?.[0],
            reason: motivoNFCe || xMotivo?.[0]?.match(/>([^<]+)</)?.[1],
            accessKey: chaveAcesso,
            protocol: protocolo,
            dateTime: dhRecbto,
            xmlComplete: xmlLimpo
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

    private async salvarArquivoDebug(conteudo: string, nome: string): Promise<void> {
        try {
            const pastaDebug = path.join(process.cwd(), 'debug');

            if (!fs.existsSync(pastaDebug)) {
                fs.mkdirSync(pastaDebug, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const nomeArquivo = `${nome}_${timestamp}.xml`;
            const caminhoCompleto = path.join(pastaDebug, nomeArquivo);

            fs.writeFileSync(caminhoCompleto, conteudo, { encoding: 'utf-8' });
        } catch (error) {
            console.log('⚠️ Erro ao salvar debug:', error);
        }
    }
}