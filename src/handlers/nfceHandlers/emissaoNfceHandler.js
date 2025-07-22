// src/handlers/emissaoNfceHandler.js
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../../config/sefaz-endpoints.js';
import { obterConfigSOAP, obterNamespaceSOAP } from '../../config/soap-config.js';
import { SoapHeadersUtil } from "../../utils/soapHeadersUtil.js";
import { TributacaoService } from "../../services/tributacaoService.js";
import { NumeracaoService } from "../../services/numeracaoService.js";
import { MemberService } from "../../services/memberService.js";
import { getDatabaseConfig } from "../../config/database.js";
import { Make } from "node-sped-nfe";
import https from 'https';
import fs from 'fs';
import path from 'path';
import { ConsultaHandler } from "./consultaNfceHandlers.js";

export class EmissaoNfceHandler {
    constructor() {
        const dbConfig = getDatabaseConfig();
        this.numeracaoService = new NumeracaoService(dbConfig);
        this.tributacaoService = new TributacaoService(dbConfig);
        this.memberService = new MemberService();
        this.consultaHandler = new ConsultaHandler();
    }

    static UF_CODES = {
        'AC': '12', 'AL': '17', 'AP': '16', 'AM': '23', 'BA': '29', 'CE': '23', 'DF': '53',
        'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15',
        'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43',
        'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17'
    };

    static PAYMENT_TYPES = {
        '01': 'Cash',
        '02': 'Check',
        '03': 'Credit Card',
        '04': 'Debit Card',
        '05': 'Store Credit',
        '10': 'Food Voucher',
        '11': 'Meal Voucher',
        '12': 'Gift Card',
        '13': 'Fuel Voucher',
        '14': 'Promissory Note',
        '15': 'Bank Slip',
        '16': 'Bank Deposit',
        '17': 'Instant Payment (PIX)',
        '18': 'Bank Transfer',
        '19': 'Loyalty Program',
        '90': 'No Payment',
        '99': 'Others'
    };

    validarFormatoNumeroNota(numeroNota) {
        const numero = typeof numeroNota === 'string' ? parseInt(numeroNota, 10) : numeroNota;
        if (isNaN(numero) || numero < 1 || numero > 999999999) {
            throw new Error(`Número da nota inválido: ${numeroNota}. Deve estar entre 1 e 999999999`);
        }
        return numero.toString();
    }

    async processarEmissaoCompleta(company, certificate, nfceData, tools) {
        try {
            const certificateConfig = {
                pfxPath: certificate.pfxPath,
                password: certificate.password,
                consumer_key: certificate.consumer_key,
                consumer_key_id: certificate.consumer_key_id,
                cnpj: company.cnpj,
                environment: certificate.environment,
                uf: certificate.uf
            };

            const nfceDataCompleta = this.montarDadosNFCe(company, nfceData);

            const resultadoEmissao = await this.emitirNFCe(tools, certificateConfig, nfceDataCompleta);

            const resultadoFinal = await this.processarResultadoEmissao(
                resultadoEmissao,
                company,
                nfceDataCompleta, 
                certificate.environment,
            );

            return resultadoFinal;

        } catch (error) {
            console.error('❌ Erro no processamento da emissão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    montarDadosNFCe(company, noteData) {
        noteData.ide.nNF = this.validarFormatoNumeroNota(noteData.ide.nNF);
        return {
            issuer: {
                cnpj: company.cnpj,
                xName: company.xName,
                xFant: company.xFant,
                ie: company.ie,
                crt: company.crt,
                address: {
                    street: company.address.street,
                    number: company.address.number,
                    neighborhood: company.address.neighborhood,
                    cityCode: company.address.cityCode,
                    city: company.address.city,
                    state: company.address.state,
                    zipCode: company.address.zipCode,
                    cPais: company.address.cCountry, 
                    xPais: company.address.xCountry, 
                    phone: company.address.phone
                }
            },
            recipient: noteData.recipient,
            ide: noteData.ide,
            products: noteData.products,
            payment: noteData.payment,
            transport: noteData.transport || { mode: "9" }
        };
    }

    async processarResultadoEmissao(
        resultadoEmissao,
        memberData,
        nfceData,
        environment
    ) {
        if (resultadoEmissao.success) {
            const dadosExtraidos = this.extrairDadosXML(resultadoEmissao, nfceData);
            console.log('✅ NFCe emitida com sucesso:', dadosExtraidos);
            // await this.memberService.salvarNFCe({ id: 1, ...memberData }, {
            //     accessKey: dadosExtraidos.accessKey ?? null,
            //     number: nfceData?.ide?.nNF ? nfceData.ide.nNF.toString().padStart(9, '0') : null,
            //     cnf: nfceData?.ide?.cNF ? nfceData.ide.cNF.toString() : null,
            //     series: nfceData?.ide?.serie ? nfceData.ide.serie.toString() : null,
            //     totalValue: typeof dadosExtraidos.totalValue === 'number' ? dadosExtraidos.totalValue : 0,
            //     status: 'authorized',
            //     protocol: dadosExtraidos.protocol ?? null,
            //     environment: environment?.toString() ?? null,
            //     operationNature: nfceData?.ide?.natOp ?? null,
            //     recipientCpf: nfceData?.recipient?.cpf ?? null,
            //     recipientName: nfceData?.recipient?.xName ?? null,
            //     xmlContent: resultadoEmissao.xmlSigned ?? null,
            //     qrCode: dadosExtraidos.qrCode ?? null,
            //     rejectionReason: null
            // });

            return this.formatarRespostaLimpa(dadosExtraidos, memberData, resultadoEmissao);
        } else {
            const totalValue = this.calcularTotalValue(nfceData);

            // await this.memberService.salvarNFCe({ id: 1, ...memberData }, {
            //     accessKey: resultadoEmissao.accessKey ?? `TEMP_${Date.now()}`,
            //     number: nfceData?.ide?.nNF ? nfceData.ide.nNF.toString().padStart(9, '0') : null,
            //     cnf: nfceData?.ide?.cNF ? nfceData.ide.cNF.toString() : null,
            //     series: nfceData?.ide?.serie ? nfceData.ide.serie.toString() : null,
            //     totalValue: typeof totalValue === 'number' ? totalValue : 0,
            //     status: 'denied',
            //     protocol: resultadoEmissao.protocol ?? null,
            //     environment: environment?.toString() ?? null,
            //     operationNature: nfceData?.ide?.natOp ?? null,
            //     recipientCpf: nfceData?.recipient?.cpf ?? null,
            //     recipientName: nfceData?.recipient?.xName ?? null,
            //     xmlContent: resultadoEmissao.xmlComplete ?? null,
            //     qrCode: null,
            //     rejectionReason: resultadoEmissao.reason ?? resultadoEmissao.error ?? null
            // });

            return {
                success: false,
                error: resultadoEmissao.reason || resultadoEmissao.error,
                message: 'NFCe was rejected by SEFAZ'
            };
        }
    }

    extrairDadosXML(resultadoEmissao, nfceData) {
        return {
            accessKey: resultadoEmissao.accessKey ?? null,
            protocol: resultadoEmissao.protocol ?? null,
            totalValue: this.calcularTotalValue(nfceData),
            qrCode: resultadoEmissao.qrCode && resultadoEmissao.qrCode.length > 0
                ? resultadoEmissao.qrCode
                : (resultadoEmissao.qrCodeAssinado ?? null),
            nfcData: {
                identification: {
                    number: nfceData?.ide?.nNF ?? '',
                    series: nfceData?.ide?.serie ?? '',
                    issueDate: nfceData?.ide?.dhEmi ?? '',
                    environment: nfceData?.ide?.tpAmb === 1 ? 'production' : 'homologation'
                },
                company: {
                    cnpj: nfceData?.issuer?.cnpj ?? '',
                    corporateName: nfceData?.issuer?.xName ?? '',
                    tradeName: nfceData?.issuer?.xFant ?? '',
                    stateRegistration: nfceData?.issuer?.ie ?? '',
                    address: nfceData?.issuer?.address ?? {}
                },
                customer: nfceData?.recipient ?? {},
                products: nfceData?.products ?? [],
                totals: {
                    productsTotal: this.calcularTotalValue(nfceData),
                    discount: this.calcularTotalDiscount(nfceData),
                    icmsValue: this.calcularTotalTax(nfceData, 'vICMS'),
                    pisValue: this.calcularTotalTax(nfceData, 'vPIS'),
                    cofinsValue: this.calcularTotalTax(nfceData, 'vCOFINS'),
                    ipiValue: this.calcularTotalTax(nfceData, 'vIPI'),
                    issValue: this.calcularTotalTax(nfceData, 'vISSQN'),
                    freight: this.calcularTotalTax(nfceData, 'vFrete'),
                    insurance: this.calcularTotalTax(nfceData, 'vSeg'),
                    otherExpenses: this.calcularTotalTax(nfceData, 'vOutro')
                },
                payments: nfceData?.payment?.detPag ?? [],
                change: nfceData?.payment?.change ?? 0
            }
        };
    }

    calcularTotalDiscount(nfceData) {
        if (!nfceData?.products?.length) {
            return 0;
        }
        return nfceData.products.reduce((sum, produto) => {
            const desconto = parseFloat(produto.vDesc || produto.discount || '0');
            return sum + (isNaN(desconto) ? 0 : desconto);
        }, 0);
    }

    calcularTotalTax(nfceData, field) {
        if (!nfceData?.products?.length) {
            return 0;
        }
        return nfceData.products.reduce((sum, produto) => {
            const valor = parseFloat(produto[field] || '0');
            return sum + (isNaN(valor) ? 0 : valor);
        }, 0);
    }

    calcularTotalValue(nfceData) {
        if (!nfceData?.products?.length) {
            return 0;
        }
        return nfceData.products.reduce((sum, produto) => {
            const valor = parseFloat(produto.vProd || '0');
            return sum + (isNaN(valor) ? 0 : valor);
        }, 0);
    }

    async emitirNFCe(tools, certificadoConfig, dados) {
        let numeracaoGerada = null;
        let configNumeracao = null;

        try {
            configNumeracao = {
                cnpj: dados.issuer.cnpj,
                uf: dados.issuer.address.state,
                serie: dados.ide.serie ? dados.ide.serie.toString() : "",
                ambiente: certificadoConfig.environment?.toString() || '2'
            };

            const xmlNFCe = await this.criarXMLNFCe(dados);

            await this.salvarArquivoDebug(xmlNFCe, 'nfce_original');

            const xmlAssinado = await tools.xmlSign(xmlNFCe);

            await this.salvarArquivoDebug(xmlAssinado, 'nfce_assinado');

             // Extrai o QR Code do XML assinado
            let qrCodeAssinado = '';
            const qrCodeMatchAssinado = xmlAssinado.match(/<qrCode>(.*?)<\/qrCode>/);
            if (qrCodeMatchAssinado) {
                qrCodeAssinado = qrCodeMatchAssinado[1];
            }
            const xmlResponse = await this.enviarParaSefaz(xmlAssinado, certificadoConfig, dados);

            await this.salvarArquivoDebug(xmlResponse, 'sefaz_resposta');

            const resultado = this.processarResposta(xmlResponse);

            resultado.xmlSigned = xmlAssinado;
            resultado.qrCodeAssinado = qrCodeAssinado;

            return resultado;

        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async criarXMLNFCe(dados) {
        const NFe = new Make();

        NFe.tagInfNFe({ Id: null, versao: '4.00' });

        NFe.tagIde({
            cUF: dados.ide.cUF,
            cNF: dados.ide.cNF,
            natOp: dados.ide.natOp,
            mod: "65",
            serie: dados.ide.serie ? dados.ide.serie.toString() : "",
            nNF: dados.ide.nNF,
            dhEmi: NFe.formatData(),
            tpNF: dados.ide.tpNF,
            idDest: dados.ide.idDest,
            cMunFG: dados.ide.cMunFG,
            tpImp: dados.ide.tpImp,
            tpEmis: dados.ide.tpEmis,
            cDV: "0",
            tpAmb: dados.ide.tpAmb,
            finNFe: dados.ide.finNFe,
            indFinal: dados.ide.indFinal,
            indPres: dados.ide.indPres,
            indIntermed: dados.ide.indIntermed || "0",
            procEmi: dados.ide.procEmi,
            verProc: dados.ide.verProc
        });

        NFe.tagEmit({
            CNPJ: dados.issuer.cnpj,
            xNome: dados.issuer.xName,
            xFant: dados.issuer.xFant,
            IE: dados.issuer.ie,
            CRT: dados.issuer.crt
        });

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

        if (dados.recipient) {
            NFe.tagDest({
                CPF: dados.recipient.cpf,
                xNome: dados.recipient.xName,
                indIEDest: dados.recipient.ieInd,
                IE: dados.recipient.ie,
                email: dados.recipient.email
            });
        }

        if (dados.recipient) {
            const destData = {};

            if (dados.recipient.cnpj) {
                destData.CNPJ = dados.recipient.cnpj.replace(/\D/g, '');
                destData.xNome = dados.recipient.xName || "CONSUMIDOR FINAL";
                destData.indIEDest = dados.recipient.ieInd || "9";
                if (dados.recipient.ie) {
                    destData.IE = dados.recipient.ie;
                }
            } else if (dados.recipient.cpf) {
                destData.CPF = dados.recipient.cpf.replace(/\D/g, '');
                destData.xNome = dados.recipient.xName || "CONSUMIDOR FINAL";
                if (dados.recipient.ie) {
                    destData.IE = dados.recipient.ie;
                    destData.indIEDest = dados.recipient.ieInd || "1";
                } else {
                    destData.indIEDest = "9";
                }
            }
            if (dados.recipient.email) {
                destData.email = dados.recipient.email;
            }
            if (destData.CPF || destData.CNPJ) {
                NFe.tagDest(destData);
            }
        }

        NFe.tagProd(
            dados.products.map(({ taxes, ...produto }) => produto)
        );

        for (let i = 0; i < dados.products.length; i++) {
            const produto = dados.products[i];
            const processedTaxes = TributacaoService.processTaxData(
                produto.taxes,
                parseFloat(produto.vProd),
                dados.issuer.crt
            );

            if (dados.issuer.crt === '1') {
                NFe.tagProdICMSSN(i, {
                    orig: processedTaxes.icms.orig,
                    CSOSN: processedTaxes.icms.CSOSN
                });
            } else {
                NFe.tagProdICMS(i, {
                    orig: processedTaxes.icms.orig,
                    CST: processedTaxes.icms.CST,
                    modBC: processedTaxes.icms.modBC,
                    pICMS: processedTaxes.icms.pICMS,
                    vBC: processedTaxes.icms.vBC,
                    vICMS: processedTaxes.icms.vICMS
                });
            }
            NFe.tagProdPIS(i, processedTaxes.pis);
            NFe.tagProdCOFINS(i, processedTaxes.cofins);
        }

        NFe.tagICMSTot();

        NFe.tagTransp({ modFrete: "9" });

        NFe.tagDetPag(dados.payment.detPag);

        if (dados.payment.change) {
            NFe.tagTroco(dados.payment.change);
        }

        NFe.tagInfRespTec({
            CNPJ: process.env.TECHNICAL_RESPONSIBLE_CNPJ,
            xContato: process.env.TECHNICAL_RESPONSIBLE_CONTACT,
            email: process.env.TECHNICAL_RESPONSIBLE_EMAIL,
            fone: process.env.TECHNICAL_RESPONSIBLE_PHONE,
        });

        return NFe.xml();
    }

    async enviarParaSefaz(xmlAssinado, certificadoConfig, dados) {
        try {
            const uf = dados.issuer.address.state;
            const cUF = dados.ide.cUF;
            const tpAmb = certificadoConfig.environment || 2;
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
                                    if (res.statusCode && res.statusCode >= 400) {
                                        this.salvarArquivoDebug(data, `erro_http_${res.statusCode}`);
                                        reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
                                        return;
                                    }
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
                                    console.error(`❌ Erro no processamento final:`, endError);
                                    reject(endError);
                                }
                            });

                            res.on('error', (resError) => {
                                console.error(`❌ Erro na resposta:`, resError);
                                reject(resError);
                            });

                        } catch (responseError) {
                            console.error(`❌ Erro ao processar resposta:`, responseError);
                            reject(responseError);
                        }
                    });

                    req.on('error', (err) => {
                        console.error(`❌ Erro na requisição HTTPS:`, err);
                        console.error(`🔍 Detalhes do erro:`, {
                            code: err.code,
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

    criarLoteNFCe(xmlNFCe) {
        const idLote = Math.floor(Math.random() * 999999999) + 1;
        const xmlLimpo = this.limparXML(xmlNFCe.replace(/^<\?xml[^>]*\?>\s*/, ''));

        return this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
        <enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        ${xmlLimpo}
        </enviNFe>`);
    }

    criarSOAPEnvelope(xmlLote, cUF) {
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

    processarResposta(xmlResposta) {
        const xmlLimpo = this.extrairXMLdoSOAP(xmlResposta);

        const cStat = xmlLimpo.match(/<cStat>(\d+)<\/cStat>/g);
        const xMotivo = xmlLimpo.match(/<xMotivo>(.*?)<\/xMotivo>/g);
        const chaveAcesso = xmlLimpo.match(/<chNFe>(\d+)<\/chNFe>/)?.[1];
        const protocolo = xmlLimpo.match(/<nProt>(\d+)<\/nProt>/)?.[1];
        const dhRecbto = xmlLimpo.match(/<dhRecbto>(.*?)<\/dhRecbto>/)?.[1];

        // Extrai o QR Code do XML, buscando em diferentes formatos
        let qrCode = '';
        // Busca dentro de <qrCode>...</qrCode>
        const qrCodeMatch = xmlLimpo.match(/<qrCode>(.*?)<\/qrCode>/);
        if (qrCodeMatch) {
            qrCode = qrCodeMatch[1];
        } else {
            // Busca dentro de <infNFeSupl><qrCode>...</qrCode></infNFeSupl>
            const infNFeSuplMatch = xmlLimpo.match(/<infNFeSupl>.*?<qrCode>(.*?)<\/qrCode>.*?<\/infNFeSupl>/s);
            if (infNFeSuplMatch) {
                qrCode = infNFeSuplMatch[1];
            } else {
                // Busca CDATA dentro de <qrCode>
                const qrCodeCdataMatch = xmlLimpo.match(/<qrCode><!\[CDATA\[(.*?)\]\]><\/qrCode>/);
                if (qrCodeCdataMatch) {
                    qrCode = qrCodeCdataMatch[1];
                }
            }
        }

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
            qrCode,
            xmlComplete: xmlLimpo
        };
    }

    limparXML(xml) {
        return xml
            .trim()
            .replace(/>\s+</g, '><')
            .replace(/\n\s*/g, '')
            .replace(/\t/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s+>/g, '>')
            .replace(/<\s+/g, '<');
    }

    extrairXMLdoSOAP(soapResponse) {
        const match = soapResponse.match(/<!\[CDATA\[(.*?)\]\]>/s) ||
            soapResponse.match(/<nfeResultMsg[^>]*>(.*?)<\/nfeResultMsg>/s);

        return match && match[1] ? match[1].trim() : soapResponse;
    }

    async salvarArquivoDebug(conteudo, nome) {
        if (process.env.NODE_ENV === 'production') {
            return;
        }
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
            // Silent fail for debug files
        }
    }

    static TECHNICAL_ERROR_PATTERNS = [
        'econnreset', 'etimedout', 'certificate', 'soap', 'network',
        'timeout', 'connection', 'ssl', 'tls', 'socket', 'enotfound', 'econnrefused'
    ];

    formatarRespostaLimpa(dadosExtraidos, memberData, resultadoEmissao) {
        const nfcData = dadosExtraidos.nfcData;
        return {
            fiscal: {
                accessKey: dadosExtraidos.accessKey,
                protocol: dadosExtraidos.protocol,
                number: nfcData?.identification?.number || '',
                series: nfcData?.identification?.series || '',
                status: {
                    code: resultadoEmissao.cStat || "100",
                    description: resultadoEmissao.reason || "Autorizado o uso da NF-e"
                },
                issueDate: nfcData?.identification?.issueDate || new Date().toISOString(),
                environment: nfcData?.identification?.environment || 'homologation'
            },
            financial: {
                totalValue: parseFloat((dadosExtraidos.totalValue || 0).toFixed(2)),
                productsValue: parseFloat((nfcData?.totals?.productsTotal || 0).toFixed(2)),
                discount: parseFloat((nfcData?.totals?.discount || 0).toFixed(2)),
                taxes: {
                    icms: parseFloat((nfcData?.totals?.icmsValue || 0).toFixed(2)),
                    pis: parseFloat((nfcData?.totals?.pisValue || 0).toFixed(2)),
                    cofins: parseFloat((nfcData?.totals?.cofinsValue || 0).toFixed(2)),
                    total: parseFloat(((nfcData?.totals?.icmsValue || 0) + (nfcData?.totals?.pisValue || 0) + (nfcData?.totals?.cofinsValue || 0)).toFixed(2))
                }
            },
            company: {
                cnpj: nfcData?.company?.cnpj || memberData.cnpj,
                corporateName: nfcData?.company?.corporateName || memberData.xName,
                tradeName: nfcData?.company?.tradeName || memberData.xFant,
                stateRegistration: nfcData?.company?.stateRegistration || memberData.ie || '',
                crt: memberData.crt,
                address: this.formatarEndereco(nfcData?.company?.address, memberData)
            },
            customer: this.formatarCliente(nfcData?.customer),
            products: this.formatarProdutos(nfcData?.products || []),
            payment: this.formatarPagamento(nfcData?.payments, nfcData?.change),
            qrCode:  dadosExtraidos.qrCode || '',
            xmlSigned: resultadoEmissao.xmlSigned
        };
    }

    formatarCliente(customer) {
        if (!customer) return null;
        return {
            cpf: customer.cpf || null,
            cnpj: customer.cnpj || null,
            name: customer.xName || customer.name || ''
        };
    }

    formatarProdutos(products) {
        return products.map((produto, index) => ({
            item: index + 1,
            code: produto.cProd || '',
            description: produto.xProd || produto.description || '',
            ncm: produto.NCM || produto.ncm || '',
            cfop: produto.CFOP || produto.cfop || '',
            quantity: parseFloat(parseFloat(produto.qCom ?? produto.quantity ?? 0).toFixed(2)),
            unitPrice: parseFloat(parseFloat(produto.vUnCom ?? produto.unitPrice ?? 0).toFixed(2)),
            totalPrice: parseFloat(parseFloat(produto.vProd ?? produto.totalPrice ?? 0).toFixed(2)),
            discount: parseFloat(parseFloat(produto.vDesc ?? produto.discount ?? 0).toFixed(2)),
            unit: produto.uCom || produto.unit || ''
        }));
    }

    formatarPagamento(payments, change = 0) {
        const payment = payments?.[0] || {};
        const changeValue = Number(change) || 0;
        return {
            method: {
                type: payment.tPag || "01",
                description: this.getPaymentDescription(payment.tPag || "01"),
                amount: parseFloat(parseFloat(payment.vPag ?? payment.amount ?? 0).toFixed(2))
            },
            change: parseFloat(changeValue.toFixed(2))
        };
    }

    formatarEndereco(address, memberData) {
        return {
            street: address?.street || memberData.address?.street || memberData.street || '',
            number: address?.number || memberData.address?.number || memberData.number || '',
            district: address?.neighborhood || address?.xBairro || memberData.address?.neighborhood || memberData.neighborhood || '',
            city: address?.city || memberData.address?.city || memberData.city || '',
            state: address?.state || memberData.address?.state || memberData.state || '',
            zipCode: address?.zipCode || memberData.address?.zipCode || memberData.zipCode || '',
            phone: address?.phone || memberData.address?.phone || memberData.phone || ''
        };
    }

    getPaymentDescription(tPag) {
        const paymentTypes = {
            "01": "Dinheiro",
            "02": "Cheque",
            "03": "Cartão de Crédito",
            "04": "Cartão de Débito",
            "05": "Cartão da Loja",
            "10": "Vale Alimentação",
            "11": "Vale Refeição",
            "12": "Vale Presente",
            "13": "Vale Combustível",
            "15": "Boleto Bancário",
            "17": "PIX",
            "90": "Sem Pagamento",
            "99": "Outros"
        };
        return paymentTypes[tPag] || "Não identificado";
    }
}
