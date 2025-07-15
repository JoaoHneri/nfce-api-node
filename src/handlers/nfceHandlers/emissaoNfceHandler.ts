// src/handlers/emissaoNfceHandler.ts
import { NFCeData, CertificadoConfig, SefazResponse } from "../../types";
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../../config/sefaz-endpoints';
import { obterConfigSOAP, obterNamespaceSOAP } from '../../config/soap-config';
import { SoapHeadersUtil } from "../../utils/soapHeadersUtil";
import { TributacaoService } from "../../services/tributacaoService";
import { NumeracaoService } from "../../services/numeracaoService";
import { MemberService } from "../../services/memberService";
import { ConfiguracaoNumeracao } from "../../types/numeracaoTypes";
import { getDatabaseConfig } from "../../config/database";
import { Make } from "node-sped-nfe";
import https from 'https';
import fs from 'fs';
import path from 'path';

export class EmissaoNfceHandler {
    private numeracaoService: NumeracaoService;
    private memberService: MemberService;

    // UF code mapping - moved to class level to avoid recreation
    private static readonly UF_CODES: { [key: string]: string } = {
        'AC': '12', 'AL': '17', 'AP': '16', 'AM': '23', 'BA': '29', 'CE': '23', 'DF': '53',
        'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15',
        'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43',
        'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17'
    };

    // Payment type mapping - moved to class level to avoid recreation
    private static readonly PAYMENT_TYPES: { [key: string]: string } = {
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

    constructor() {
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
                consumer_key: memberData.certificate.consumer_key,
                consumer_key_id: memberData.certificate.consumer_key_id,
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
                cUF: EmissaoNfceHandler.UF_CODES[memberData.state] || '35',
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
                verProc: "1.0",
            },
            products: nfceData.products,
            technicalResponsible: nfceData.technicalResponsible,
           
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

            // 🎯 NOVA ESTRUTURA DE RESPOSTA - APENAS DADOS ESSENCIAIS
            return this.formatarRespostaLimpa(dadosExtraidos, memberData, resultadoEmissao);
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
                message: 'NFCe was rejected by SEFAZ'
            };
        }
    }

    private extrairDadosXML(resultado: SefazResponse, nfceData: any): any {
        let totalValue = 0;
        let dadosCompletos: any = {};

        if (resultado.xmlSigned) {
            const xml = resultado.xmlSigned;
            
            // ===== DADOS BÁSICOS DA NFCe =====
            const vNFMatch = xml.match(/<vNF>([\d.,]+)<\/vNF>/);
            if (vNFMatch) {
                totalValue = parseFloat(vNFMatch[1]);
            }

            // ===== EXTRAIR DADOS PARA IMPRESSÃO =====
            
            // 📋 Dados de Identificação
            const nNFMatch = xml.match(/<nNF>(\d+)<\/nNF>/);
            const serieMatch = xml.match(/<serie>(\d+)<\/serie>/);
            const dhEmiMatch = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/);
            const cNFMatch = xml.match(/<cNF>(\d+)<\/cNF>/);
            
            // 🏢 Dados do Emitente
            const emitCNPJMatch = xml.match(/<emit>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/);
            const emitXNomeMatch = xml.match(/<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>/);
            const emitXFantMatch = xml.match(/<emit>[\s\S]*?<xFant>([^<]+)<\/xFant>/);
            const emitIEMatch = xml.match(/<emit>[\s\S]*?<IE>([^<]+)<\/IE>/);
            const emitCRTMatch = xml.match(/<emit>[\s\S]*?<CRT>([^<]+)<\/CRT>/);
            
            // 📍 Endereço do Emitente
            const emitXLgrMatch = xml.match(/<enderEmit>[\s\S]*?<xLgr>([^<]+)<\/xLgr>/);
            const emitNroMatch = xml.match(/<enderEmit>[\s\S]*?<nro>([^<]+)<\/nro>/);
            const emitXBairroMatch = xml.match(/<enderEmit>[\s\S]*?<xBairro>([^<]+)<\/xBairro>/);
            const emitCMunMatch = xml.match(/<enderEmit>[\s\S]*?<cMun>([^<]+)<\/cMun>/);
            const emitXMunMatch = xml.match(/<enderEmit>[\s\S]*?<xMun>([^<]+)<\/xMun>/);
            const emitUFMatch = xml.match(/<enderEmit>[\s\S]*?<UF>([^<]+)<\/UF>/);
            const emitCEPMatch = xml.match(/<enderEmit>[\s\S]*?<CEP>([^<]+)<\/CEP>/);
            const emitFoneMatch = xml.match(/<enderEmit>[\s\S]*?<fone>([^<]+)<\/fone>/);

            // 👤 Dados do Destinatário (se houver)
            const destCPFMatch = xml.match(/<dest>[\s\S]*?<CPF>([^<]+)<\/CPF>/);
            const destCNPJMatch = xml.match(/<dest>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/);
            const destXNomeMatch = xml.match(/<dest>[\s\S]*?<xNome>([^<]+)<\/xNome>/);

            // 📦 Produtos - Extrair todos os produtos
            const produtos: any[] = [];
            const produtosRegex = /<det nItem="(\d+)">([\s\S]*?)<\/det>/g;
            let produtoMatch;
            
            while ((produtoMatch = produtosRegex.exec(xml)) !== null) {
                const nItem = produtoMatch[1];
                const produtoXML = produtoMatch[2];
                
                const cProdMatch = produtoXML.match(/<cProd>([^<]+)<\/cProd>/);
                const cEANMatch = produtoXML.match(/<cEAN>([^<]+)<\/cEAN>/);
                const xProdMatch = produtoXML.match(/<xProd>([^<]+)<\/xProd>/);
                const NCMMatch = produtoXML.match(/<NCM>([^<]+)<\/NCM>/);
                const CFOPMatch = produtoXML.match(/<CFOP>([^<]+)<\/CFOP>/);
                const uComMatch = produtoXML.match(/<uCom>([^<]+)<\/uCom>/);
                const qComMatch = produtoXML.match(/<qCom>([^<]+)<\/qCom>/);
                const vUnComMatch = produtoXML.match(/<vUnCom>([^<]+)<\/vUnCom>/);
                const vProdMatch = produtoXML.match(/<vProd>([^<]+)<\/vProd>/);
                const cEANTribMatch = produtoXML.match(/<cEANTrib>([^<]+)<\/cEANTrib>/);
                const uTribMatch = produtoXML.match(/<uTrib>([^<]+)<\/uTrib>/);
                const qTribMatch = produtoXML.match(/<qTrib>([^<]+)<\/qTrib>/);
                const vUnTribMatch = produtoXML.match(/<vUnTrib>([^<]+)<\/vUnTrib>/);
                const vDescMatch = produtoXML.match(/<vDesc>([^<]+)<\/vDesc>/);

                produtos.push({
                    nItem: parseInt(nItem),
                    cProd: cProdMatch?.[1] || '',
                    cEAN: cEANMatch?.[1] || '',
                    description: xProdMatch?.[1] || '',
                    NCM: NCMMatch?.[1] || '',
                    CFOP: CFOPMatch?.[1] || '',
                    unit: uComMatch?.[1] || '',
                    quantity: parseFloat(qComMatch?.[1] || '0'),
                    unitPrice: parseFloat(vUnComMatch?.[1] || '0'),
                    totalPrice: parseFloat(vProdMatch?.[1] || '0'),
                    cEANTrib: cEANTribMatch?.[1] || '',
                    uTrib: uTribMatch?.[1] || '',
                    qTrib: parseFloat(qTribMatch?.[1] || '0'),
                    vUnTrib: parseFloat(vUnTribMatch?.[1] || '0'),
                    discount: vDescMatch ? parseFloat(vDescMatch[1]) : 0
                });
            }

            // 💰 Totais da NFCe
            const vBCMatch = xml.match(/<vBC>([^<]+)<\/vBC>/);
            const vICMSMatch = xml.match(/<vICMS>([^<]+)<\/vICMS>/);
            const vICMSDesoneMatch = xml.match(/<vICMSDesone>([^<]+)<\/vICMSDesone>/);
            const vFCPMatch = xml.match(/<vFCP>([^<]+)<\/vFCP>/);
            const vBCSTMatch = xml.match(/<vBCST>([^<]+)<\/vBCST>/);
            const vSTMatch = xml.match(/<vST>([^<]+)<\/vST>/);
            const vFCPSTMatch = xml.match(/<vFCPST>([^<]+)<\/vFCPST>/);
            const vFCPSTRetMatch = xml.match(/<vFCPSTRet>([^<]+)<\/vFCPSTRet>/);
            const vProdTotalMatch = xml.match(/<vProd>([^<]+)<\/vProd>/);
            const vFreteMatch = xml.match(/<vFrete>([^<]+)<\/vFrete>/);
            const vSegMatch = xml.match(/<vSeg>([^<]+)<\/vSeg>/);
            const vDescTotalMatch = xml.match(/<vDesc>([^<]+)<\/vDesc>/);
            const vIIMatch = xml.match(/<vII>([^<]+)<\/vII>/);
            const vIPIMatch = xml.match(/<vIPI>([^<]+)<\/vIPI>/);
            const vIPIDevolvMatch = xml.match(/<vIPIDevol>([^<]+)<\/vIPIDevol>/);
            const vPISMatch = xml.match(/<vPIS>([^<]+)<\/vPIS>/);
            const vCOFINSMatch = xml.match(/<vCOFINS>([^<]+)<\/vCOFINS>/);
            const vOutroMatch = xml.match(/<vOutro>([^<]+)<\/vOutro>/);

            // 💳 Formas de Pagamento
            const payments: any[] = [];
            const pagamentosRegex = /<detPag>([\s\S]*?)<\/detPag>/g;
            let pagamentoMatch;
            
            while ((pagamentoMatch = pagamentosRegex.exec(xml)) !== null) {
                const pagamentoXML = pagamentoMatch[1];
                
                const indPagMatch = pagamentoXML.match(/<indPag>([^<]+)<\/indPag>/);
                const tPagMatch = pagamentoXML.match(/<tPag>([^<]+)<\/tPag>/);
                const xPagMatch = pagamentoXML.match(/<xPag>([^<]+)<\/xPag>/);
                const vPagMatch = pagamentoXML.match(/<vPag>([^<]+)<\/vPag>/);

                payments.push({
                    indPag: indPagMatch?.[1] || '0',
                    tPag: tPagMatch?.[1] || '',
                    paymentType: EmissaoNfceHandler.PAYMENT_TYPES[tPagMatch?.[1] || ''] || 'Not Informed',
                    description: xPagMatch?.[1] || '',
                    amount: parseFloat(vPagMatch?.[1] || '0')
                });
            }

            // 💸 Troco
            const vTrocoMatch = xml.match(/<vTroco>([^<]+)<\/vTroco>/);

            // 📱 QR Code
            let qrCode = null;
            const qrMatch = xml.match(/<qrCode>\s*(https?:\/\/[^\s<]+)\s*<\/qrCode>/s);
            if (qrMatch) {
                qrCode = qrMatch[1].trim();
            }

            // 🔑 Chave de Acesso
            let accessKey = resultado.accessKey;
            if (!accessKey && xml) {
                const keyMatch = xml.match(/Id="NFe([0-9]{44})"/);
                if (keyMatch) {
                    accessKey = keyMatch[1];
                }
            }

            // 📋 Protocolo
            let protocol = resultado.protocol;
            if (!protocol && resultado.xmlComplete) {
                const protocolMatch = resultado.xmlComplete.match(/<nProt>([^<]+)<\/nProt>/);
                if (protocolMatch) {
                    protocol = protocolMatch[1];
                }
            }

            // 🏛️ Informações do Ambiente
            const tpAmbMatch = xml.match(/<tpAmb>([^<]+)<\/tpAmb>/);
            const environment = tpAmbMatch?.[1] === '1' ? 'Production' : 'Homologation';

            // ⏰ Data/Hora de Emissão formatada
            const issueDate = dhEmiMatch?.[1] ? new Date(dhEmiMatch[1]).toLocaleString('pt-BR') : '';

            // 🔢 Formar dados completos para impressão
            dadosCompletos = {
                // Identification da NFCe
                identification: {
                    accessKey: accessKey,
                    number: nNFMatch?.[1] || '',
                    series: serieMatch?.[1] || '',
                    cNF: cNFMatch?.[1] || '',
                    issueDate: issueDate,
                    environment: environment,
                    protocol: protocol
                },

                // Company (Emitente)
                company: {
                    cnpj: emitCNPJMatch?.[1] || '',
                    corporateName: emitXNomeMatch?.[1] || '',
                    tradeName: emitXFantMatch?.[1] || '',
                    stateRegistration: emitIEMatch?.[1] || '',
                    crt: emitCRTMatch?.[1] || '',
                    address: {
                        street: emitXLgrMatch?.[1] || '',
                        number: emitNroMatch?.[1] || '',
                        district: emitXBairroMatch?.[1] || '',
                        cityCode: emitCMunMatch?.[1] || '',
                        city: emitXMunMatch?.[1] || '',
                        state: emitUFMatch?.[1] || '',
                        zipCode: emitCEPMatch?.[1] || '',
                        phone: emitFoneMatch?.[1] || ''
                    }
                },

                // Customer (Destinatário) - optional
                customer: (destCPFMatch || destCNPJMatch) ? {
                    cpf: destCPFMatch?.[1] || '',
                    cnpj: destCNPJMatch?.[1] || '',
                    name: destXNomeMatch?.[1] || ''
                } : null,

                // Products List
                products: produtos,

                // NFCe Totals
                totals: {
                    icmsCalculationBase: parseFloat(vBCMatch?.[1] || '0'),
                    icmsValue: parseFloat(vICMSMatch?.[1] || '0'),
                    icmsExemptValue: parseFloat(vICMSDesoneMatch?.[1] || '0'),
                    fcpValue: parseFloat(vFCPMatch?.[1] || '0'),
                    stCalculationBase: parseFloat(vBCSTMatch?.[1] || '0'),
                    stValue: parseFloat(vSTMatch?.[1] || '0'),
                    fcpSTValue: parseFloat(vFCPSTMatch?.[1] || '0'),
                    fcpSTRetainedValue: parseFloat(vFCPSTRetMatch?.[1] || '0'),
                    productsTotal: parseFloat(vProdTotalMatch?.[1] || '0'),
                    freight: parseFloat(vFreteMatch?.[1] || '0'),
                    insurance: parseFloat(vSegMatch?.[1] || '0'),
                    discount: parseFloat(vDescTotalMatch?.[1] || '0'),
                    importTax: parseFloat(vIIMatch?.[1] || '0'),
                    ipiValue: parseFloat(vIPIMatch?.[1] || '0'),
                    ipiReturnedValue: parseFloat(vIPIDevolvMatch?.[1] || '0'),
                    pisValue: parseFloat(vPISMatch?.[1] || '0'),
                    cofinsValue: parseFloat(vCOFINSMatch?.[1] || '0'),
                    otherExpenses: parseFloat(vOutroMatch?.[1] || '0'),
                    invoiceTotal: totalValue
                },

                // Payment Methods
                payments: payments,
                change: vTrocoMatch ? parseFloat(vTrocoMatch[1]) : 0,

                // QR Code and URL
                qrCode: qrCode
            };
        }

        // Retornar dados básicos + dados completos para impressão
        return { 
            totalValue, 
            qrCode: dadosCompletos.qrCode, 
            accessKey: dadosCompletos.identification?.accessKey, 
            protocol: dadosCompletos.identification?.protocol,
            // 🎯 NOVOS DADOS PARA IMPRESSÃO
            nfcData: dadosCompletos
        };
    }

    private calcularTotalValue(nfceData: any): number {
        if (!nfceData?.products?.length) {
            return 0;
        }
        
        return nfceData.products.reduce((sum: number, produto: any) => {
            const valor = parseFloat(produto.vProd || '0');
            return sum + (isNaN(valor) ? 0 : valor);
        }, 0);
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

            // 🔄 Continuar com o processo normal
            const xmlNFCe = await this.criarXMLNFCe(dados);

            await this.salvarArquivoDebug(xmlNFCe, 'nfce_original');

            const xmlAssinado = await tools.xmlSign(xmlNFCe);

            await this.salvarArquivoDebug(xmlAssinado, 'nfce_assinado');

            const xmlResponse = await this.enviarParaSefaz(xmlAssinado, certificadoConfig, dados);

            await this.salvarArquivoDebug(xmlResponse, 'sefaz_resposta');

            const resultado = this.processarResposta(xmlResponse);

            // 🔄 Adicionar o XML assinado ao resultado
            resultado.xmlSigned = xmlAssinado;

            return resultado;

        } catch (error: any) {
            // � RECUPERAÇÃO: Liberar numeração em caso de falha técnica
            if (numeracaoGerada && configNumeracao && this.isFalhaTecnica(error)) {
                try {
                    await this.numeracaoService.liberarNumeracaoReservada(
                        configNumeracao,
                        numeracaoGerada.nNF,
                        `Falha técnica: ${error.message}`
                    );
                } catch (recoveryError) {
                    console.error('❌ Erro ao liberar numeração:', recoveryError);
                }
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


        if (dados.recipient) {
            NFe.tagDest({
                CPF: dados.recipient.cpf,
                CNPJ: dados.recipient.cnpj,
                xNome: dados.recipient.xName,
                indIEDest: dados.recipient.ieInd || "9"
            });
        }

        // Products

        // Adiciona os produtos sem o campo 'taxes'
        NFe.tagProd(
            dados.products.map(({ taxes, ...produto }) => produto)
        );

        dados.products.forEach((produto, index) => {
            // Process tax data using taxes from each product
            let valorProduto = parseFloat(produto.vProd);
            if (isNaN(valorProduto)) {
                valorProduto = 0;
                console.warn(`Produto com vProd inválido ou ausente (index ${index}):`, produto);
            }
            const processedTaxes = TributacaoService.processTaxData(
                produto.taxes,
                valorProduto,
                dados.issuer.crt
            );

            // ICMS
            NFe.tagProdICMSSN(index, processedTaxes.icms);

            // PIS
            NFe.tagProdPIS(index, processedTaxes.pis);

            // COFINS
            NFe.tagProdCOFINS(index, processedTaxes.cofins);
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
        // Only save debug files in development environment
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

    // Technical error patterns - moved to class level constant
    private static readonly TECHNICAL_ERROR_PATTERNS = [
        'econnreset', 'etimedout', 'certificate', 'soap', 'network',
        'timeout', 'connection', 'ssl', 'tls', 'socket', 'enotfound', 'econnrefused'
    ];

    /**
     * Check if error is technical (can recover numbering) or SEFAZ rejection (keep consumed)
     */
    private isFalhaTecnica(error: any): boolean {
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        const searchText = `${errorMessage} ${errorCode}`;

        return EmissaoNfceHandler.TECHNICAL_ERROR_PATTERNS.some(pattern =>
            searchText.includes(pattern)
        );
    }

    /**
     * Formata a resposta da API com apenas os dados essenciais para o negócio
     * Remove campos técnicos como detectedMode, documents, processing
     */
    private formatarRespostaLimpa(dadosExtraidos: any, memberData: any, resultadoEmissao: SefazResponse): any {
        const nfcData = dadosExtraidos.nfcData;
        
        return {
            // ❌ REMOVER: success: true - já está no controller
            
            // ✅ DADOS FISCAIS ESSENCIAIS
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

            // 💰 DADOS FINANCEIROS COM TAXES SEMPRE PRESENTE
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

            // 🏢 DADOS DA EMPRESA
            company: {
                cnpj: nfcData?.company?.cnpj || memberData.cnpj,
                corporateName: nfcData?.company?.corporateName || memberData.xName,
                tradeName: nfcData?.company?.tradeName || memberData.xFant,
                stateRegistration: nfcData?.company?.stateRegistration || memberData.ie || '',
                crt: memberData.crt,
                address: this.formatarEndereco(nfcData?.company?.address, memberData)
            },

            // 👤 DADOS DO CLIENTE (sempre objeto, pode ser null)
            customer: this.formatarCliente(nfcData?.customer),

            // 📦 PRODUTOS (sempre array, pode ser vazio)
            products: this.formatarProdutos(nfcData?.products || []),

            // 💳 PAGAMENTO (sempre objeto estruturado)
            payment: this.formatarPagamento(nfcData?.payments, nfcData?.change),

            // 📱 QR CODE (sempre string)
            qrCode:  dadosExtraidos.qrCode || '',

            // 📄 XML ASSINADO
            xmlSigned: resultadoEmissao.xmlSigned
        };
    }

    // Métodos auxiliares para garantir estrutura consistente
    private formatarCliente(customer: any): any {
        if (!customer) return null;
        
        return {
            cpf: customer.cpf || null,
            cnpj: customer.cnpj || null,
            name: customer.name || ''
        };
    }

    private formatarProdutos(products: any[]): any[] {
        return products.map((produto, index) => ({
            item: index + 1,
            code: produto.cProd || '',
            description: produto.description || '',
            ncm: produto.NCM || '',
            cfop: produto.CFOP || '',
            quantity: parseFloat((produto.quantity || 0).toFixed(2)),
            unitPrice: parseFloat((produto.unitPrice || 0).toFixed(2)),
            totalPrice: parseFloat((produto.totalPrice || 0).toFixed(2)),
            discount: parseFloat((produto.discount || 0).toFixed(2)),
            unit: produto.unit || ''
        }));
    }

    private formatarPagamento(payments: any[], change: number = 0): any {
        const payment = payments?.[0] || {};
        
        return {
            method: {
                type: payment.tPag || "01",
                description: this.getPaymentDescription(payment.tPag || "01"),
                amount: parseFloat((payment.amount || 0).toFixed(2))
            },
            change: parseFloat((change || 0).toFixed(2))
        };
    }

    private formatarEndereco(address: any, memberData: any): any {
        return {
            street: address?.street || memberData.street || '',
            number: address?.number || memberData.number || '',
            district: address?.district || memberData.neighborhood || '',
            city: address?.city || memberData.city || '',
            state: address?.state || memberData.state || '',
            zipCode: address?.zipCode || memberData.zipCode || '',
            phone: address?.phone || memberData.phone || ''
        };
    }

    private getPaymentDescription(tPag: string): string {
        const paymentTypes: { [key: string]: string } = {
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