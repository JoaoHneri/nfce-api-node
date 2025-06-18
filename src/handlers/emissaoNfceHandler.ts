// src/handlers/emissaoNfceHandler.ts
import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { NFCeData, CertificadoConfig, SefazResponse } from "../types";
import { ENDPOINTS_HOMOLOGACAO, ENDPOINTS_PRODUCAO } from '../config/sefaz-endpoints';
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
            console.log('📝 Iniciando emissão de NFCe via handler...');

            // 1. Criar XML da NFCe usando Make
            const xmlNFCe = await this.criarXMLNFCe(dados);
            console.log('✅ XML da NFCe criado');

            // 2. Salvar XML original para debug
            await this.salvarArquivoDebug(xmlNFCe, 'nfce_original');

            // 3. Assinar XML usando tools
            const xmlAssinado = await tools.xmlSign(xmlNFCe);
            console.log('✅ XML assinado via tools.xmlSign');

            // 4. Salvar XML assinado para debug
            await this.salvarArquivoDebug(xmlAssinado, 'nfce_assinado');

            // 5. Enviar para SEFAZ
            const xmlResponse = await this.enviarParaSefaz(xmlAssinado, certificadoConfig, dados);
            console.log('📡 Enviado para SEFAZ');

            // 6. Salvar resposta para debug
            await this.salvarArquivoDebug(xmlResponse, 'sefaz_resposta');

            // 7. Processar resposta
            return this.processarResposta(xmlResponse);

        } catch (error: any) {
            console.error('❌ Erro na emissão:', error);
            return {
                sucesso: false,
                erro: error.message
            };
        }
    }

    private async criarXMLNFCe(dados: NFCeData): Promise<string> {
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

    private async enviarParaSefaz(xmlAssinado: string, certificadoConfig: CertificadoConfig, dados: NFCeData): Promise<string> {

        const uf = dados.emitente.endereco.UF;
        const cUF = dados.ide.cUF;
        const tpAmb = dados.ide.tpAmb;
        const ambiente = tpAmb === '1' ? 'producao' : 'homologacao';

        const endpoints = ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
        const url = endpoints[uf]?.nfceAutorizacao;

        if (!url) {
            throw new Error(`Endpoint de autorização não configurado para UF: ${uf}`);
        }


        const xmlLote = this.criarLoteNFCe(xmlAssinado);

        const soapEnvelope = this.criarSOAPEnvelope(xmlLote, cUF);

        if (!certificadoConfig.pfx || !certificadoConfig.senha) {
            throw new Error('Certificado não configurado adequadamente');
        }

        if (!fs.existsSync(certificadoConfig.pfx)) {
            throw new Error(`Arquivo de certificado não encontrado: ${certificadoConfig.pfx}`);
        }

        const certificado = fs.readFileSync(certificadoConfig.pfx);
        console.log('✅ Certificado carregado, tamanho:', certificado.length, 'bytes');

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
                    'Content-Length': Buffer.byteLength(soapEnvelope),
                    'User-Agent': 'NFCe-API/1.0'
                },
                pfx: certificado,
                passphrase: certificadoConfig.senha,
                rejectUnauthorized: false,
                secureProtocol: 'TLSv1_2_method'
            };

            console.log('🌐 Conectando em:', `${urlObj.hostname}${urlObj.pathname}`);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log('📡 Status HTTP:', res.statusCode);
                    console.log('📡 Resposta recebida, tamanho:', data.length);

                    if (data.length > 0) {
                        console.log('📄 Primeiros 300 chars:', data.substring(0, 300));
                    }

                    try {
                        const xmlLimpo = this.extrairXMLdoSOAP(data);
                        resolve(xmlLimpo);
                    } catch (error) {
                        resolve(data);
                    }
                });
            });

            req.on('error', (err) => {
                console.error('❌ Erro na requisição:', err);
                reject(err);
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Timeout na requisição de autorização'));
            });

            req.write(soapEnvelope);
            req.end();
        });
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
        const namespace = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';

        return this.limparXML(`<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Header>
        <nfeCabecMsg xmlns="${namespace}">
        <versaoDados>4.00</versaoDados>
        <cUF>${cUF}</cUF>
        </nfeCabecMsg>
        </soap12:Header>
        <soap12:Body>
        <nfeDadosMsg xmlns="${namespace}">${xmlLote.replace(/^<\?xml[^>]*\?>\s*/, '')}</nfeDadosMsg>
        </soap12:Body>
        </soap12:Envelope>`);
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
            console.log(`💾 Arquivo salvo: ${nomeArquivo}`);
        } catch (error) {
            console.log('⚠️ Erro ao salvar debug:', error);
        }
    }

    private criarXMLStatusServico(cUF: string, ambiente: 'homologacao' | 'producao'): string {
        const tpAmb = ambiente === 'producao' ? '1' : '2';

                return `<?xml version="1.0" encoding="utf-8"?>
        <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
        </consStatServ>`;
    }

    private async fazerRequisicaoSefaz(url: string, xmlDados: string, certificadoConfig: CertificadoConfig): Promise<string> {
                const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
        <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">${xmlDados}</nfeDadosMsg>
        </soap12:Body>
        </soap12:Envelope>`;

        if (!fs.existsSync(certificadoConfig.pfx)) {
            throw new Error(`Arquivo de certificado não encontrado: ${certificadoConfig.pfx}`);
        }

        const certificado = fs.readFileSync(certificadoConfig.pfx);

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(soapEnvelope)
                },
                pfx: certificado,
                passphrase: certificadoConfig.senha,
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });

            req.write(soapEnvelope);
            req.end();
        });
    }

    private obterCodigoUF(uf: string): string {
        const codigos: Record<string, string> = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
            'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
            'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
            'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
            'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
            'SE': '28', 'TO': '17'
        };

        const codigo = codigos[uf.toUpperCase()];
        if (!codigo) {
            throw new Error(`Código UF não encontrado para: ${uf}`);
        }

        return codigo;
    }
}