// src/handlers/emissaoNfceHandler.ts
import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { NFCeData, CertificadoConfig, SefazResponse } from "../types";
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../config/sefaz-endpoints';
import { obterConfigSOAP, obterNamespaceSOAP } from '../config/soap-config';
import { SoapHeadersUtil } from "../utils/soapHeadersUtil";
import { TributacaoService } from "../services/tributacaoService";
import { NumeracaoService } from "../services/numeracaoService";
import { MemberService } from "../services/memberService";
import { ConfiguracaoNumeracao } from "../types/numeracaoTypes";
import { getDatabaseConfig } from "../config/database";
import { Make } from "node-sped-nfe";
import https from 'https';
import fs from 'fs';
import path from 'path';

export class EmissaoNfceHandler {
    private parser: SefazResponseParser;
    private numeracaoService: NumeracaoService;
    private memberService: MemberService;

    constructor() {
        this.parser = new SefazResponseParser();

        // Inicializa o service de numeração com configuração do banco
        const dbConfig = getDatabaseConfig();
        this.numeracaoService = new NumeracaoService(dbConfig);
        this.memberService = new MemberService();
    }

    /**
     * Valida e formata o número da nota fiscal para evitar erros de schema
     * Remove zeros à esquerda e valida range (1-999999999)
     */
    private validarFormatoNumeroNota(numeroNota: number | string): string {
        const numero = typeof numeroNota === 'string' ? parseInt(numeroNota, 10) : numeroNota;
        
        if (isNaN(numero) || numero < 1 || numero > 999999999) {
            throw new Error(`Número da nota inválido: ${numeroNota}. Deve estar entre 1 e 999999999`);
        }
        
        // Retorna o número sem zeros à esquerda (conforme schema TNF da SEFAZ)
        return numero.toString();
    }
    
    async processarEmissaoCompleta(memberCnpj: string, environment: number, nfceData: any, sefazService: any): Promise<{
        success: boolean;
        accessKey?: string;
        protocol?: string;
        qrCode?: string;
        xmlSigned?: string;
        error?: string;
        [key: string]: any;
    }> {
        try {
            // 1. Buscar dados da empresa e certificado
            const memberData = await this.memberService.buscarDadosCompletos(memberCnpj, environment);
            if (!memberData) {
                return {
                    success: false,
                    error: 'Company or certificate not found'
                };
            }

            // 2. Gerar numeração
            const dadosNumeracao = await this.numeracaoService.gerarProximaNumeracao({
                cnpj: memberData.member.cnpj,
                uf: memberData.member.state,
                serie: nfceData.ide.serie,
                ambiente: environment.toString() as '1' | '2'
            });

            // 3. Preparar configuração do certificado
            const certificateConfig: CertificadoConfig = {
                pfxPath: memberData.certificate.pfxPath,
                password: memberData.certificate.password,
                csc: memberData.certificate.csc,
                cscId: memberData.certificate.cscId,
                cnpj: memberData.member.cnpj,
                environment: parseInt(memberData.certificate.environment),
                uf: memberData.certificate.uf
            };

            // 4. Obter tools
            const tools = await sefazService.obterTools(certificateConfig);

            // 5. Montar dados completos da NFCe
            const nfceDataCompleta = this.montarDadosNFCe(memberData.member, nfceData, dadosNumeracao, environment);

            // 6. Emitir NFCe
            const resultadoEmissao = await this.emitirNFCe(tools, certificateConfig, nfceDataCompleta);

            // 7. Processar resultado e salvar no banco
            const resultadoFinal = await this.processarResultadoEmissao(
                resultadoEmissao,
                memberData.member,
                dadosNumeracao,
                nfceData,
                environment
            );

            return resultadoFinal;

        } catch (error: any) {
            console.error('❌ Erro no processamento da emissão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }


    private montarDadosNFCe(memberData: any, nfceData: any, dadosNumeracao: any, environment: number): NFCeData {
        const getUFCode = (uf: string): string => {
            const ufCodes: { [key: string]: string } = {
                'AC': '12', 'AL': '17', 'AP': '16', 'AM': '23', 'BA': '29', 'CE': '23', 'DF': '53',
                'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15',
                'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43',
                'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17'
            };
            return ufCodes[uf] || '35';
        };

        return {
            issuer: {
                cnpj: memberData.cnpj,
                xName: memberData.xName,
                xFant: memberData.xFant,
                ie: memberData.ie,
                crt: memberData.crt,
                address: {
                    street: memberData.street,
                    number: memberData.number,
                    neighborhood: memberData.neighborhood,
                    cityCode: memberData.cityCode,
                    city: memberData.city,
                    state: memberData.state,
                    zipCode: memberData.zipCode,
                    cPais: memberData.cPais,
                    xPais: memberData.xPais,
                    phone: memberData.phone
                }
            },
            recipient: nfceData.recipient,
            ide: {
                cUF: getUFCode(memberData.state),
                cNF: dadosNumeracao.cNF,
                natOp: nfceData.ide.natOp,
                serie: nfceData.ide.serie,
                nNF: dadosNumeracao.nNF,
                dhEmi: new Date().toISOString(),
                tpNF: "1",
                idDest: "1",
                cMunFG: memberData.cityCode,
                tpImp: "4",
                tpEmis: "1",
                tpAmb: environment.toString(),
                finNFe: "1",
                indFinal: "1",
                indPres: "1",
                indIntermed: "0",
                procEmi: "0",
                verProc: "1.0"
            },
            products: nfceData.products,
            technicalResponsible: nfceData.technicalResponsible,
            taxes: {
                orig: "0",
                CSOSN: memberData.crt === "1" ? "102" : "400",
                CST_PIS: "49",
                CST_COFINS: "49"
            },
            payment: nfceData.payment,
            transport: nfceData.transport || { mode: "9" }
        };
    }

    private async processarResultadoEmissao(
        resultadoEmissao: SefazResponse,
        memberData: any,
        dadosNumeracao: any,
        nfceData: any,
        environment: number
    ): Promise<any> {
        if (resultadoEmissao.success) {
            // ✅ NFCe autorizada - extrair dados e salvar
            const dadosExtraidos = this.extrairDadosXML(resultadoEmissao, nfceData);

            await this.memberService.salvarNFCe(memberData, {
                accessKey: dadosExtraidos.accessKey,
                number: dadosNumeracao.nNF.padStart(9, '0'),
                cnf: dadosNumeracao.cNF,
                series: nfceData.ide.serie,
                totalValue: dadosExtraidos.totalValue,
                status: 'authorized',
                protocol: dadosExtraidos.protocol,
                environment: environment.toString(),
                operationNature: nfceData.ide.natOp,
                recipientCpf: nfceData.recipient?.cpf || null,
                recipientName: nfceData.recipient?.xName || null,
                xmlContent: resultadoEmissao.xmlSigned,
                qrCode: dadosExtraidos.qrCode,
                rejectionReason: null
            });

            return {
                success: true,
                accessKey: dadosExtraidos.accessKey,
                protocol: dadosExtraidos.protocol,
                qrCode: dadosExtraidos.qrCode,
                xmlSigned: resultadoEmissao.xmlSigned,
                number: dadosNumeracao.nNF,
                series: nfceData.ide.serie,
                totalValue: dadosExtraidos.totalValue,
                dateTime: resultadoEmissao.dateTime,
                status: resultadoEmissao.cStat,
                reason: resultadoEmissao.reason,
                company: {
                    cnpj: memberData.cnpj,
                    name: memberData.xName
                },
                numbering: {
                    nNF: dadosNumeracao.nNF,
                    cNF: dadosNumeracao.cNF
                }
            };
        } else {
            // ❌ NFCe rejeitada - salvar como denied
            const totalValue = this.calcularTotalValue(nfceData);

            await this.memberService.salvarNFCe(memberData, {
                accessKey: resultadoEmissao.accessKey || `TEMP_${Date.now()}`,
                number: dadosNumeracao.nNF.padStart(9, '0'),
                cnf: dadosNumeracao.cNF,
                series: nfceData.ide.serie,
                totalValue,
                status: 'denied',
                protocol: resultadoEmissao.protocol || null,
                environment: environment.toString(),
                operationNature: nfceData.ide.natOp,
                recipientCpf: nfceData.recipient?.cpf || null,
                recipientName: nfceData.recipient?.xName || null,
                xmlContent: resultadoEmissao.xmlComplete,
                qrCode: null,
                rejectionReason: resultadoEmissao.reason || resultadoEmissao.error
            });

            return {
                success: false,
                error: resultadoEmissao.reason || resultadoEmissao.error,
                totalValue,
                cStat: resultadoEmissao.cStat,
                reason: resultadoEmissao.reason,
                numbering: {
                    nNF: dadosNumeracao.nNF,
                    cNF: dadosNumeracao.cNF
                }
            };
        }
    }

    private extrairDadosXML(resultado: SefazResponse, nfceData: any): any {
        let totalValue = 0;
        if (resultado.xmlSigned) {
            const vNFMatch = resultado.xmlSigned.match(/<vNF>([\d.,]+)<\/vNF>/);
            if (vNFMatch) {
                totalValue = parseFloat(vNFMatch[1]);
            }
        }

        if (totalValue === 0) {
            totalValue = this.calcularTotalValue(nfceData);
        }

        let qrCode = null;
        if (resultado.xmlSigned) {
            const qrMatch = resultado.xmlSigned.match(/<qrCode>\s*(https?:\/\/[^\s<]+)\s*<\/qrCode>/s);
            if (qrMatch) {
                qrCode = qrMatch[1].trim();
            }
        }

        let accessKey = resultado.accessKey;
        if (!accessKey && resultado.xmlSigned) {
            const keyMatch = resultado.xmlSigned.match(/Id="NFe([0-9]{44})"/);
            if (keyMatch) {
                accessKey = keyMatch[1];
            }
        }

        let protocol = resultado.protocol;
        if (!protocol && resultado.xmlComplete) {
            const protocolMatch = resultado.xmlComplete.match(/<nProt>([^<]+)<\/nProt>/);
            if (protocolMatch) {
                protocol = protocolMatch[1];
            }
        }

        return { totalValue, qrCode, accessKey, protocol };
    }

    private calcularTotalValue(nfceData: any): number {
        if (nfceData.products && Array.isArray(nfceData.products)) {
            return nfceData.products.reduce((sum: number, produto: any) => {
                return sum + parseFloat(produto.vProd || '0');
            }, 0);
        }
        return 0;
    }

    async emitirNFCe(tools: any, certificadoConfig: CertificadoConfig, dados: NFCeData): Promise<SefazResponse> {
        let numeracaoGerada: { nNF: string; cNF: string } | null = null;
        let configNumeracao: ConfiguracaoNumeracao | null = null;

        try {
            // 🔢 GERAR NUMERAÇÃO AUTOMÁTICA
            configNumeracao = {
                cnpj: dados.issuer.cnpj,
                uf: dados.issuer.address.state,
                serie: dados.ide.serie,
                ambiente: certificadoConfig.environment?.toString() as '1' | '2' || '2'
            };

            numeracaoGerada = await this.numeracaoService.gerarProximaNumeracao(configNumeracao);

            // 🔧 Validar formato do número gerado (garantia adicional)
            const numeroValidado = this.validarFormatoNumeroNota(numeracaoGerada.nNF);
            
            // Atribui nNF e cNF gerados automaticamente
            dados.ide.nNF = numeroValidado;
            dados.ide.cNF = numeracaoGerada.cNF;

            console.log(`📊 Numeração gerada e validada: nNF=${numeroValidado}, cNF=${numeracaoGerada.cNF}`);

            // 🔄 Continuar com o processo normal
            const xmlNFCe = await this.criarXMLNFCe(dados);

            await this.salvarArquivoDebug(xmlNFCe, 'nfce_original');

            const xmlAssinado = await tools.xmlSign(xmlNFCe);

            await this.salvarArquivoDebug(xmlAssinado, 'nfce_assinado');

            const xmlResponse = await this.enviarParaSefaz(xmlAssinado, certificadoConfig, dados);

            await this.salvarArquivoDebug(xmlResponse, 'sefaz_resposta');

            const resultado = this.processarResposta(xmlResponse);

            // 📊 LOG DO RESULTADO (não precisa atualizar banco adicional, pois invoices já mantém o status)
            if (numeracaoGerada) {
                if (resultado.success) {
                    // ✅ Sucesso - NFCe autorizada
                    console.log(`✅ NFCe autorizada - nNF: ${numeracaoGerada.nNF}, cNF: ${numeracaoGerada.cNF}`);
                    console.log(`📋 Chave: ${resultado.accessKey}, Protocolo: ${resultado.protocol}`);
                } else {
                    // ❌ Rejeitada - log do motivo
                    console.log(`❌ NFCe rejeitada - nNF: ${numeracaoGerada.nNF}, cNF: ${numeracaoGerada.cNF}`);
                    console.log(`📋 Motivo: ${resultado.reason}`);
                }
            }

            // 🔄 Adicionar o XML assinado ao resultado
            resultado.xmlSigned = xmlAssinado;

            return resultado;

        } catch (error: any) {
            console.error('❌ Erro na emissão:', error);

            // � RECUPERAÇÃO: Liberar numeração em caso de falha técnica
            if (numeracaoGerada && configNumeracao && this.isFalhaTecnica(error)) {
                try {
                    await this.numeracaoService.liberarNumeracaoReservada(
                        configNumeracao,
                        numeracaoGerada.nNF,
                        `Falha técnica: ${error.message}`
                    );
                    console.log(`🔄 Numeração ${numeracaoGerada.nNF} liberada automaticamente`);
                } catch (recoveryError) {
                    console.error('❌ Erro ao liberar numeração:', recoveryError);
                }
            } else if (numeracaoGerada && configNumeracao) {
                // ✅ Log da falha para auditoria
                console.error(`❌ Falha na emissão - nNF: ${numeracaoGerada.nNF}, cNF: ${numeracaoGerada.cNF}, Erro: ${error.message}`);
            }

            return {
                success: false,
                error: error.message,
                // Retornar numeração para debug se foi gerada
                debugInfo: numeracaoGerada ? {
                    nNF: numeracaoGerada.nNF,
                    cNF: numeracaoGerada.cNF,
                    recovered: this.isFalhaTecnica(error)
                } : undefined
            } as any;
        }
    }

    private async criarXMLNFCe(dados: NFCeData): Promise<string> {
        const NFe = new Make();

        NFe.tagInfNFe({ Id: null, versao: '4.00' });

        NFe.tagIde({
            cUF: dados.ide.cUF,
            cNF: dados.ide.cNF!, // Agora garantido que existe
            natOp: dados.ide.natOp,
            mod: "65",
            serie: dados.ide.serie,
            nNF: dados.ide.nNF!, // Agora garantido que existe
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
            CNPJ: dados.issuer.cnpj,
            xNome: dados.issuer.xName,
            xFant: dados.issuer.xFant,
            IE: dados.issuer.ie,
            CRT: dados.issuer.crt
        });

        // Issuer address
        NFe.tagEnderEmit({
            xLgr: dados.issuer.address.street,
            nro: dados.issuer.address.number,
            xBairro: dados.issuer.address.neighborhood,
            cMun: dados.issuer.address.cityCode,
            xMun: dados.issuer.address.city,
            UF: dados.issuer.address.state,
            CEP: dados.issuer.address.zipCode,
            cPais: dados.issuer.address.cPais || "1058",
            xPais: dados.issuer.address.xPais || "BRASIL",
            fone: dados.issuer.address.phone
        });

        // Recipient (optional)
        if (dados.recipient) {
            NFe.tagDest({
                CPF: dados.recipient.cpf,
                CNPJ: dados.recipient.cnpj,
                xNome: dados.recipient.xName,
                indIEDest: dados.recipient.ieInd || "9"
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
                dados.issuer.crt,           // "1" = Simples Nacional ou outro CRT
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
            NFe.tagTransp({ modFrete: dados.transport.mode });
        } else {
            NFe.tagTransp({ modFrete: "9" }); // No transport occurrence
        }

        // Payment
        NFe.tagDetPag(dados.payment.detPag);

        if (dados.payment.change) {
            NFe.tagTroco(dados.payment.change);
        }

        if (dados.technicalResponsible) {
            NFe.tagInfRespTec({
                CNPJ: dados.technicalResponsible.CNPJ,
                xContato: dados.technicalResponsible.xContact,
                email: dados.technicalResponsible.email,
                fone: dados.technicalResponsible.phone,
            });
        }


        return NFe.xml();
    }

    private async enviarParaSefaz(xmlAssinado: string, certificadoConfig: CertificadoConfig, dados: NFCeData): Promise<string> {
        try {
            const uf = dados.issuer.address.state;
            const cUF = dados.ide.cUF;
            const tpAmb = certificadoConfig.environment || 2; // 1 - Produção, 2 - Homologação
            const ambiente = tpAmb === 1 ? 'producao' : 'homologacao';
            const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
            const url = endpoints[uf]?.nfceAutorizacao;

            if (!url) {
                throw new Error(`Endpoint de autorização não configurado para UF: ${uf}`);
            }

            const xmlLote = this.criarLoteNFCe(xmlAssinado);
            const soapEnvelope = this.criarSOAPEnvelope(xmlLote, cUF);

            await this.salvarArquivoDebug(soapEnvelope, 'soap_envelope');

            if (!certificadoConfig.pfxPath || !certificadoConfig.password) {
                throw new Error('Certificado não configurado adequadamente');
            }

            if (!fs.existsSync(certificadoConfig.pfxPath)) {
                throw new Error(`Arquivo de certificado não encontrado: ${certificadoConfig.pfxPath}`);
            }

            const certificado = fs.readFileSync(certificadoConfig.pfxPath);

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

    /**
     * Identificar se é falha técnica (pode recuperar numeração) ou rejeição SEFAZ (manter consumida)
     */
    private isFalhaTecnica(error: any): boolean {
        const falhaTecnica = [
            'ECONNRESET',
            'ETIMEDOUT',
            'certificate',
            'SOAP',
            'Network',
            'timeout',
            'connection',
            'SSL',
            'TLS',
            'socket',
            'ENOTFOUND',
            'ECONNREFUSED'
        ];

        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';

        return falhaTecnica.some(tipo =>
            errorMessage.includes(tipo.toLowerCase()) ||
            errorCode.includes(tipo.toLowerCase())
        );
    }
}