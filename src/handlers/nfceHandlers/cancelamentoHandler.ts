// src/handlers/cancelamentoHandler.ts
import { SefazResponseParser } from "../../parsers/sefazResponseParsers";
import { CancelamentoRequest, CancelamentoResponse, CertificadoConfig } from "../../types";
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../../config/sefaz-endpoints';
import { obterConfigSOAP, obterNamespaceSOAP } from '../../config/soap-config';
import { SoapHeadersUtil } from "../../utils/soapHeadersUtil";
import { NumeracaoService } from "../../services/numeracaoService";
import { MemberService } from "../../services/memberService";
import { getDatabaseConfig } from "../../config/database";
import https from 'https';
import fs from 'fs';

export class CancelamentoHandler {
    private parser: SefazResponseParser;
    private numeracaoService: NumeracaoService;
    private memberService: MemberService;

    constructor() {
        this.parser = new SefazResponseParser();
        
        const dbConfig = getDatabaseConfig();
        this.numeracaoService = new NumeracaoService(dbConfig);
        this.memberService = new MemberService();
    }

    async processarCancelamentoPorCNPJ(
        memberCnpj: string,
        environment: number,
        accessKey: string,
        protocol: string,
        justification: string,
        sefazService: any
    ): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }> {
        try {
            // 1. Buscar dados da empresa + certificado automaticamente
            const dados = await this.memberService.buscarDadosCompletos(memberCnpj, environment);
            
            if (!dados) {
                return {
                    success: false,
                    error: `No active company/certificate found for CNPJ: ${memberCnpj} in environment: ${environment}`
                };
            }

            const { member: memberData, certificate: certificateData } = dados;

            // 2. Preparar configuração do certificado
            const certificateConfig: CertificadoConfig = {
                pfxPath: certificateData.pfxPath,
                password: certificateData.password,
                csc: certificateData.csc,
                cscId: certificateData.cscId,
                cnpj: memberData.cnpj,
                environment: parseInt(certificateData.environment),
                uf: certificateData.uf
            };

            // 3. Preparar dados do cancelamento
            const dadosCancelamento: CancelamentoRequest = {
                accessKey,
                protocol,
                justification
            };

            // 4. Obter tools e executar cancelamento
            const tools = await sefazService.obterTools(certificateConfig);
            const resultado = await this.cancelarNFCe(tools, certificateConfig, dadosCancelamento);

            if (resultado.success) {
                // 5. Atualizar status no banco usando MemberService
                await this.atualizarStatusNoBanco(accessKey, justification);

                return {
                    success: true,
                    data: {
                        accessKey,
                        protocol: resultado.protocol,
                        justification,
                        cancelDate: new Date().toISOString(),
                        company: {
                            cnpj: memberData.cnpj,
                            name: memberData.xName
                        },
                        sefaz: {
                            cStat: resultado.cStat,
                            reason: resultado.reason,
                            protocol: resultado.protocol
                        }
                    }
                };
            } else {
                return {
                    success: false,
                    error: resultado.reason || resultado.error,
                    data: {
                        accessKey,
                        cStat: resultado.cStat,
                        reason: resultado.reason,
                        justification
                    }
                };
            }

        } catch (error: any) {
            console.error('❌ Erro no processamento do cancelamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private async atualizarStatusNoBanco(accessKey: string, justification: string): Promise<void> {
        try {
            // Verificar se a NFCe existe
            const nfce = await this.memberService.buscarNfcePorChave(accessKey);
            
            if (nfce) {
                // Atualizar status para cancelado
                await this.memberService.atualizarStatusNfce(
                    accessKey, 
                    'cancelled', 
                    `Cancelamento: ${justification}`
                );
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar status no banco:', error);
            // Não falha a operação principal se não conseguir atualizar
        }
    }

    async cancelarNFCe(tools: any, certificadoConfig: CertificadoConfig, dados: CancelamentoRequest): Promise<CancelamentoResponse> {
        try {
            // Validações
            const validacao = this.validarDados(dados);
            if (!validacao.valido) {
                return {
                    success: false,
                    status: "validation_error",
                    cStat: "999",
                    reason: validacao.erro!,
                    accessKey: dados.accessKey,
                    xmlComplete: "",
                    error: validacao.erro
                };
            }

            // 1. Criar estrutura do evento
            const eventoObj = this.criarObjetoEvento(dados, certificadoConfig);

            let xmlEvento;
            if (typeof tools.json2xml === 'function') {
                xmlEvento = await tools.json2xml(eventoObj);
            } else {
                // Fallback: usar XMLBuilder
                xmlEvento = this.converterParaXML(eventoObj);
            }

            const xmlAssinado = await tools.xmlSign(xmlEvento, { tag: "infEvento" });

            const soapEnvelope = this.criarSOAPEnvelope(xmlAssinado, dados.accessKey.substring(0, 2));

            const xmlResponse = await this.enviarParaSefaz(soapEnvelope, dados.accessKey, certificadoConfig);

            const resultado = this.parser.parseCancelamentoResponse(xmlResponse, dados.accessKey);

            if (resultado.success && resultado.cStat === '135') { // 135 = Cancelamento homologado
                await this.atualizarStatusCancelamento(dados.accessKey, resultado);
            }

            return resultado;

        } catch (error: any) {
            return {
                success: false,
                status: "communication_error",
                cStat: "999",
                reason: "Error processing cancellation",
                accessKey: dados.accessKey,
                xmlComplete: "",
                error: error.message
            };
        }
    }

    private criarObjetoEvento(dados: CancelamentoRequest, certificadoConfig: CertificadoConfig): any {
        const agora = new Date();
        
        const brasiliaTime = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
        
        brasiliaTime.setMinutes(brasiliaTime.getMinutes());
        
        const dhEvento = brasiliaTime.toISOString().replace(/\.\d{3}Z$/, '-03:00');
        
        const nSeqEvento = 1;
        const cOrgao = dados.accessKey.substring(0, 2);
        
        const idLote = this.gerarIdLote();

        const detEvento = {
            "@versao": "1.00",
            "descEvento": "Cancelamento",
            "nProt": dados.protocol,
            "xJust": dados.justification
        };

        return {
            "envEvento": {
                "@xmlns": "http://www.portalfiscal.inf.br/nfe",
                "@versao": "1.00",
                "idLote": idLote,
                "evento": {
                    "@xmlns": "http://www.portalfiscal.inf.br/nfe",
                    "@versao": "1.00",
                    "infEvento": {
                        "@Id": `ID110111${dados.accessKey}${nSeqEvento.toString().padStart(2, '0')}`,
                        "cOrgao": cOrgao,
                        "tpAmb": "2",
                        "CNPJ": certificadoConfig.cnpj || "",
                        "chNFe": dados.accessKey,
                        "dhEvento": dhEvento, 
                        "tpEvento": "110111",
                        "nSeqEvento": nSeqEvento,
                        "verEvento": "1.00",
                        "detEvento": detEvento
                    }
                }
            }
        };
    }

    private async enviarParaSefaz(soapEnvelope: string, chaveAcesso: string, certificadoConfig: CertificadoConfig): Promise<string> {
    try {
        const cUF = chaveAcesso.substring(0, 2);
        const ufMap: Record<string, string> = {
            '35': 'SP', '33': 'RJ', '31': 'MG', '41': 'PR', '42': 'SC', '43': 'RS'
        };
        
        const uf = ufMap[cUF] || 'SP';

        const tpAmb = Number(certificadoConfig?.environment) || 2;
        const ambiente = tpAmb === 1 ? 'producao' : 'homologacao';
        const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
        const url = endpoints[uf]?.nfceCancelamento;

        if (!url) {
            throw new Error(`Endpoint de cancelamento não configurado para UF: ${uf}`);
        }

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
                
                // 🚀 Headers específicos por estado para CANCELAMENTO
                const headers = SoapHeadersUtil.obterCabecalhosCancelamentoPorEstado(uf, soapEnvelope);

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
                                    reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
                                    return;
                                }

                                // 🚨 Verificar se contém erro SOAP
                                if (data.includes('soap:Fault') || data.includes('faultstring')) {
                                    reject(new Error(`Erro SOAP: ${data}`));
                                    return;
                                }

                                try {
                                    const xmlLimpo = this.limparSOAP(data);
                                    resolve(xmlLimpo);
                                } catch (xmlError) {
                                    resolve(data);
                                }                                } catch (endError) {
                                    console.error(`❌ Erro no processamento final:`, endError);
                                    reject(endError);
                                }
                        });                            res.on('error', (resError) => {
                                console.error(`❌ Erro na resposta:`, resError);
                                reject(resError);
                            });                        } catch (responseError) {
                            console.error(`❌ Erro ao processar resposta:`, responseError);
                            reject(responseError);
                        }
                });

                req.on('error', (err) => {
                    reject(err);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout na requisição de cancelamento (30s)'));
                });

                req.setTimeout(30000);
                
                req.write(soapEnvelope);
                req.end();                } catch (promiseError) {
                    reject(promiseError);
                }
        });

    } catch (methodError) {
        throw methodError;
    }
    }

    private gerarIdLote(): string {
        const agora = new Date();
        const ano = agora.getFullYear().toString().slice(2);
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const segundo = String(agora.getSeconds()).padStart(2, '0');

        let idLote = `${ano}${mes}${dia}${hora}${minuto}${segundo}`;

        while (idLote.length < 15) {
            idLote += Math.floor(Math.random() * 10);
        }

        return idLote;
    }

    private converterParaXML(objeto: any): string {
        const { XMLBuilder } = require('fast-xml-parser');
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            format: true
        });
        return builder.build(objeto);
    }

    private criarSOAPEnvelope(xmlEvento: string, cUF: string): string {
        const xmlLimpo = xmlEvento.replace(/^<\?xml[^>]*\?>\s*/, '');

        // Para todos os estados, usar configuração padrão (incluindo RS)
        const config = obterConfigSOAP(cUF, 'cancelamento');
        const soapNamespace = obterNamespaceSOAP(config.protocoloSOAP);

        // Detecta se tagMsg tem prefixo nfe:
        const usaPrefixoNfe = config.tagMsg.includes('nfe:');

        // Extrai namespace nfe do xmlnsTagMsg (se tiver)
        const matchNsNfe = config.xmlnsTagMsg.match(/xmlns(:nfe)?="([^"]+)"/);
        const nsNfe = matchNsNfe ? matchNsNfe[2] : null;

        // Monta atributo para declarar xmlns:nfe no Envelope (só se usar prefixo nfe)
        const xmlnsNfeNoEnvelope = usaPrefixoNfe && nsNfe
            ? `xmlns:nfe="${nsNfe}"`
            : '';

        return `<?xml version="1.0" encoding="UTF-8"?>
    <${config.envelopePrefixo}:Envelope xmlns:${config.envelopePrefixo}="${soapNamespace}" ${xmlnsNfeNoEnvelope}>
    <${config.envelopePrefixo}:Body>
        <${config.tagMsg} ${config.xmlnsTagMsg}>
        ${xmlLimpo}
        </${config.tagMsg}>
    </${config.envelopePrefixo}:Body>
    </${config.envelopePrefixo}:Envelope>`;
    }

    private limparSOAP(soapResponse: string): string {
        const patterns = [
            /<!\[CDATA\[(.*?)\]\]>/s,
            /<retEnvEvento[^>]*>(.*?)<\/retEnvEvento>/s
        ];

        for (const pattern of patterns) {
            const match = soapResponse.match(pattern);
            if (match && match[1]) return match[1].trim();
        }

        return soapResponse;
    }

    private validarDados(dados: CancelamentoRequest): { valido: boolean; erro?: string } {
        if (!dados.accessKey || dados.accessKey.length !== 44) {
            return { valido: false, erro: "Invalid access key - must have 44 digits" };
        }

        if (!dados.protocol) {
            return { valido: false, erro: "Authorization protocol is required" };
        }

        if (!dados.justification || dados.justification.length < 15) {
            return { valido: false, erro: "Justification must have at least 15 characters" };
        }

        if (dados.justification.length > 255) {
            return { valido: false, erro: "Justification must have at most 255 characters" };
        }

        return { valido: true };
    }

    private async atualizarStatusCancelamento(chaveAcesso: string, resultadoCancelamento: any): Promise<void> {
        try {
            // Extrair dados da chave de acesso para localizar no banco
            const cnpj = this.extrairCNPJDaChave(chaveAcesso);
            const uf = this.extrairUFDaChave(chaveAcesso);
            const serie = this.extrairSerieDaChave(chaveAcesso);
            const nNF = this.extrairNNFDaChave(chaveAcesso);
            const ambiente = this.extrairAmbienteDaChave(chaveAcesso);

        } catch (error) {
            console.error('❌ Erro ao atualizar status de cancelamento:', error);
            // Não falha a operação principal se não conseguir atualizar o histórico
        }
    }

    /**
     * Extrair CNPJ da chave de acesso (posições 6-19)
     */
    private extrairCNPJDaChave(chave: string): string {
        return chave.substring(6, 20);
    }

    /**
     * Extrair UF da chave de acesso (primeiros 2 dígitos)
     */
    private extrairUFDaChave(chave: string): string {
        const codigoUF = chave.substring(0, 2);
        // Mapear código UF para sigla
        const mapaUF: { [key: string]: string } = {
            '35': 'SP', '41': 'PR', '43': 'RS', '33': 'RJ', '31': 'MG',
            '23': 'CE', '53': 'DF', '52': 'GO', '21': 'MA', '50': 'MS',
            '51': 'MT', '15': 'PA', '25': 'PB', '26': 'PE', '22': 'PI',
            '32': 'ES', '24': 'RN', '11': 'RO', '14': 'RR', '42': 'SC',
            '28': 'SE', '17': 'TO', '27': 'AL', '16': 'AP', '13': 'AM',
            '29': 'BA', '12': 'AC'
        };
        return mapaUF[codigoUF] || 'SP';
    }

    /**
     * Extrair série da chave de acesso (posições 22-24)
     */
    private extrairSerieDaChave(chave: string): string {
        return chave.substring(22, 25);
    }

    /**
     * Extrair nNF da chave de acesso (posições 25-33)
     */
    private extrairNNFDaChave(chave: string): string {
        return parseInt(chave.substring(25, 34)).toString();
    }

    /**
     * Extrair ambiente da chave de acesso (posição 34)
     */
    private extrairAmbienteDaChave(chave: string): '1' | '2' {
        return chave.substring(34, 35) as '1' | '2';
    }


}