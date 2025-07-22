// src/handlers/cancelamentoHandler.js
import { SefazResponseParser } from '../../parsers/sefazResponseParsers.js';
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../../config/sefaz-endpoints.js';
import { obterConfigSOAP, obterNamespaceSOAP } from '../../config/soap-config.js';
import { SoapHeadersUtil } from "../../utils/soapHeadersUtil.js";
import { NumeracaoService } from "../../services/numeracaoService.js";
import { MemberService } from "../../services/memberService.js";
import { getDatabaseConfig } from "../../config/database.js";
import https from 'https';
import fs from 'fs';

export class CancelamentoHandler {
    constructor() {
        this.parser = new SefazResponseParser();
        const dbConfig = getDatabaseConfig();
        this.numeracaoService = new NumeracaoService(dbConfig);
        this.memberService = new MemberService();
    }

    async atualizarStatusNoBanco(accessKey, justification) {
        try {
            const nfce = await this.memberService.buscarNfcePorChave(accessKey);
            if (nfce) {
                await this.memberService.atualizarStatusNfce(
                    accessKey,
                    'cancelled',
                    `Cancelamento: ${justification}`
                );
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar status no banco:', error);
        }
    }

    async cancelarNFCe(tools, certificadoConfig, dados, memberData) {
        try {
            const validacao = this.validarDados(dados);
            if (!validacao.valido) {
                return {
                    success: false,
                    error: validacao.erro,
                    data: {
                        accessKey: dados.accessKey,
                        cStat: "999",
                        reason: validacao.erro,
                        justification: dados.justification
                    }
                };
            }
            const eventoObj = this.criarObjetoEvento(dados, certificadoConfig);
            let xmlEvento;
            if (typeof tools.json2xml === 'function') {
                xmlEvento = await tools.json2xml(eventoObj);
            } else {
                xmlEvento = this.converterParaXML(eventoObj);
            }
            const xmlAssinado = await tools.xmlSign(xmlEvento, { tag: "infEvento" });
            const soapEnvelope = this.criarSOAPEnvelope(xmlAssinado, dados.accessKey.substring(0, 2));
            const xmlResponse = await this.enviarParaSefaz(soapEnvelope, dados.accessKey, certificadoConfig);
            const resultado = this.parser.parseCancelamentoResponse(xmlResponse, dados.accessKey);

            if (resultado.success && resultado.cStat === '135') {
                await this.atualizarStatusCancelamento(dados.accessKey, resultado);
            }

            if (resultado.success) {
                return {
                    success: true,
                    data: {
                        accessKey: dados.accessKey,
                        protocol: resultado.protocol,
                        justification: dados.justification,
                        cancelDate: new Date().toISOString(),
                        company: memberData
                            ? { cnpj: memberData.cnpj, name: memberData.xName }
                            : undefined,
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
                        accessKey: dados.accessKey,
                        cStat: resultado.cStat,
                        reason: resultado.reason,
                        justification: dados.justification
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    criarObjetoEvento(dados, certificadoConfig) {
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

    async enviarParaSefaz(soapEnvelope, chaveAcesso, certificadoConfig) {
        try {
            const cUF = chaveAcesso.substring(0, 2);
            const ufMap = {
                '35': 'SP', '33': 'RJ', '31': 'MG', '41': 'PR', '42': 'SC', '43': 'RS'
            };
            const uf = ufMap[cUF] || 'SP';
            const tpAmb = Number(certificadoConfig?.environment) || 2;
            const ambiente = tpAmb === 1 ? 'producao' : 'homologacao';
            const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
            const url = endpoints[uf]?.nfceCancelamento;
            if (!url) throw new Error(`Endpoint de cancelamento não configurado para UF: ${uf}`);
            if (!certificadoConfig.pfxPath || !certificadoConfig.password) throw new Error('Certificado não configurado adequadamente');
            if (!fs.existsSync(certificadoConfig.pfxPath)) throw new Error(`Arquivo de certificado não encontrado: ${certificadoConfig.pfxPath}`);
            const certificado = fs.readFileSync(certificadoConfig.pfxPath);

            return new Promise((resolve, reject) => {
                try {
                    const urlObj = new URL(url);
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
                        let data = '';
                        res.on('data', (chunk) => { data += chunk.toString(); });
                        res.on('end', () => {
                            if (res.statusCode && res.statusCode >= 400) {
                                reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
                                return;
                            }
                            if (data.includes('soap:Fault') || data.includes('faultstring')) {
                                reject(new Error(`Erro SOAP: ${data}`));
                                return;
                            }
                            try {
                                const xmlLimpo = this.limparSOAP(data);
                                resolve(xmlLimpo);
                            } catch (xmlError) {
                                resolve(data);
                            }
                        });
                        res.on('error', (resError) => {
                            reject(resError);
                        });
                    });
                    req.on('error', (err) => { reject(err); });
                    req.on('timeout', () => {
                        req.destroy();
                        reject(new Error('Timeout na requisição de cancelamento (30s)'));
                    });
                    req.setTimeout(30000);
                    req.write(soapEnvelope);
                    req.end();
                } catch (promiseError) {
                    reject(promiseError);
                }
            });
        } catch (methodError) {
            throw methodError;
        }
    }

    gerarIdLote() {
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

    converterParaXML(objeto) {
        const { XMLBuilder } = require('fast-xml-parser');
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            format: true
        });
        return builder.build(objeto);
    }

    criarSOAPEnvelope(xmlEvento, cUF) {
        const xmlLimpo = xmlEvento.replace(/^<\?xml[^>]*\?>\s*/, '');
        const config = obterConfigSOAP(cUF, 'cancelamento');
        const soapNamespace = obterNamespaceSOAP(config.protocoloSOAP);
        const usaPrefixoNfe = config.tagMsg.includes('nfe:');
        const matchNsNfe = config.xmlnsTagMsg.match(/xmlns(:nfe)?="([^"]+)"/);
        const nsNfe = matchNsNfe ? matchNsNfe[2] : null;
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

    limparSOAP(soapResponse) {
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

    validarDados(dados) {
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

    async atualizarStatusCancelamento(chaveAcesso, resultadoCancelamento) {
        try {
            const cnpj = this.extrairCNPJDaChave(chaveAcesso);
            const uf = this.extrairUFDaChave(chaveAcesso);
            const serie = this.extrairSerieDaChave(chaveAcesso);
            const nNF = this.extrairNNFDaChave(chaveAcesso);
            const ambiente = this.extrairAmbienteDaChave(chaveAcesso);
        } catch (error) {
            console.error('❌ Erro ao atualizar status de cancelamento:', error);
        }
    }

    extrairCNPJDaChave(chave) {
        return chave.substring(6, 20);
    }

    extrairUFDaChave(chave) {
        const codigoUF = chave.substring(0, 2);
        const mapaUF = {
            '35': 'SP', '41': 'PR', '43': 'RS', '33': 'RJ', '31': 'MG',
            '23': 'CE', '53': 'DF', '52': 'GO', '21': 'MA', '50': 'MS',
            '51': 'MT', '15': 'PA', '25': 'PB', '26': 'PE', '22': 'PI',
            '32': 'ES', '24': 'RN', '11': 'RO', '14': 'RR', '42': 'SC',
            '28': 'SE', '17': 'TO', '27': 'AL', '16': 'AP', '13': 'AM',
            '29': 'BA', '12': 'AC'
        };
        return mapaUF[codigoUF] || 'SP';
    }

    extrairSerieDaChave(chave) {
        return chave.substring(22, 25);
    }

    extrairNNFDaChave(chave) {
        return parseInt(chave.substring(25, 34)).toString();
    }

    extrairAmbienteDaChave(chave) {
        return chave.substring(34, 35);
    }
}

