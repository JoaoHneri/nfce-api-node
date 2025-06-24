// src/handlers/cancelamentoHandler.ts
import { SefazResponseParser } from '../parsers/sefazResponseParsers';
import {
  CancelamentoRequestDto,
  CancelamentoResponseDto,
  CertificadoConfigDto,
} from '../dto';
import {
  ENDPOINTS_HOMOLOGACAO,
  ENDPOINTS_PRODUCAO,
} from 'src/config/sefaz-endpoints';
import { obterConfigSOAP, obterNamespaceSOAP } from '../config/soap-config';
import * as https from 'https';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CancelamentoHandler {
  private parser: SefazResponseParser;

  constructor() {
    this.parser = new SefazResponseParser();
  }

  async cancelarNFCe(
    tools: any,
    certificadoConfig: CertificadoConfigDto,
    dados: CancelamentoRequestDto,
  ): Promise<CancelamentoResponseDto> {
    try {
      // Validações
      const validacao = this.validarDados(dados);
      if (!validacao.valido) {
        return {
          sucesso: false,
          status: 'erro_validacao',
          cStat: '999',
          xMotivo: validacao.erro!,
          chaveAcesso: dados.chaveAcesso,
          xmlCompleto: '',
          erro: validacao.erro,
        };
      }

      // 1. Criar estrutura do evento
      const eventoObj = this.criarObjetoEvento(dados, certificadoConfig);

      // 2. ✅ USAR TOOLS para converter JSON para XML
      let xmlEvento;
      if (typeof tools.json2xml === 'function') {
        xmlEvento = await tools.json2xml(eventoObj);
      } else {
        // Fallback: usar XMLBuilder
        xmlEvento = this.converterParaXML(eventoObj);
      }

      // 3. ✅ USAR TOOLS para assinar XML
      const xmlAssinado = await tools.xmlSign(xmlEvento, { tag: 'infEvento' });

      // 4. Criar envelope SOAP
      const soapEnvelope = this.criarSOAPEnvelope(
        xmlAssinado,
        dados.chaveAcesso.substring(0, 2),
      );

      // 5. ✅ Enviar para SEFAZ usando certificado do config
      const xmlResponse = await this.enviarParaSefaz(
        soapEnvelope,
        dados.chaveAcesso,
        certificadoConfig,
      );

      // 6. Parse da resposta
      return this.parser.parseCancelamentoResponse(
        xmlResponse,
        dados.chaveAcesso,
      );
    } catch (error: any) {
      console.error('❌ Erro no cancelamento:', error);
      return {
        sucesso: false,
        status: 'erro_comunicacao',
        cStat: '999',
        xMotivo: 'Erro no processamento do cancelamento',
        chaveAcesso: dados.chaveAcesso,
        xmlCompleto: '',
        erro: error.message,
      };
    }
  }

  private criarObjetoEvento(
    dados: CancelamentoRequestDto,
    certificadoConfig: CertificadoConfigDto,
  ): any {
    const agora = new Date();

    const brasiliaTime = new Date(agora.getTime() - 3 * 60 * 60 * 1000);

    brasiliaTime.setMinutes(brasiliaTime.getMinutes());

    const dhEvento = brasiliaTime.toISOString().replace(/\.\d{3}Z$/, '-03:00');

    const nSeqEvento = 1;
    const cOrgao = dados.chaveAcesso.substring(0, 2);

    const idLote = this.gerarIdLote();

    const detEvento = {
      '@versao': '1.00',
      descEvento: 'Cancelamento',
      nProt: dados.protocolo,
      xJust: dados.justificativa,
    };

    return {
      envEvento: {
        '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
        '@versao': '1.00',
        idLote: idLote,
        evento: {
          '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
          '@versao': '1.00',
          infEvento: {
            '@Id': `ID110111${dados.chaveAcesso}${nSeqEvento.toString().padStart(2, '0')}`,
            cOrgao: cOrgao,
            tpAmb: '2',
            CNPJ: certificadoConfig.CNPJ || '',
            chNFe: dados.chaveAcesso,
            dhEvento: dhEvento,
            tpEvento: '110111',
            nSeqEvento: nSeqEvento,
            verEvento: '1.00',
            detEvento: detEvento,
          },
        },
      },
    };
  }

  private async enviarParaSefaz(
    soapEnvelope: string,
    chaveAcesso: string,
    certificadoConfig: CertificadoConfigDto,
  ): Promise<string> {
    const cUF = chaveAcesso.substring(0, 2);
    const ufMap: Record<string, string> = {
      '35': 'SP',
      '33': 'RJ',
      '31': 'MG',
      '41': 'PR',
      '42': 'SC',
      '43': 'RS',
    };

    const uf = ufMap[cUF] || 'SP';

    const tpAmb = Number(certificadoConfig?.tpAmb) || 2;
    const ambiente = tpAmb === 1 ? 'producao' : 'homologacao';
    const endpoints =
      ambiente === 'producao' ? ENDPOINTS_PRODUCAO : ENDPOINTS_HOMOLOGACAO;
    const url = endpoints[uf]?.nfceCancelamento;

    if (!url) {
      throw new Error(
        `Endpoint de cancelamento não configurado para UF: ${uf}`,
      );
    }

    if (!certificadoConfig.pfx || !certificadoConfig.senha) {
      throw new Error('Certificado não configurado adequadamente');
    }

    if (!fs.existsSync(certificadoConfig.pfx)) {
      throw new Error(
        `Arquivo de certificado não encontrado: ${certificadoConfig.pfx}`,
      );
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
          'Content-Length': Buffer.byteLength(soapEnvelope),
        },
        pfx: certificado,
        passphrase: certificadoConfig.senha,
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method',
      };

      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk));
        res.on('end', () => {
          try {
            const xmlLimpo = this.limparSOAP(data);
            resolve(xmlLimpo);
          } catch (error) {
            resolve(data);
          }
        });
      });

      req.on('error', (err: any) => {
        console.error('Erro na requisição:', err);
        reject(err);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout na requisição de cancelamento'));
      });

      req.write(soapEnvelope);
      req.end();
    });
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
      attributeNamePrefix: '@',
      format: true,
    });
    return builder.build(objeto);
  }

  private criarSOAPEnvelope(xmlEvento: string, cUF: string): string {
    const config = obterConfigSOAP(cUF, 'cancelamento');
    const soapNamespace = obterNamespaceSOAP(config.protocoloSOAP);

    const xmlLimpo = xmlEvento.replace(/^<\?xml[^>]*\?>\s*/, '');

    // Detecta se tagMsg tem prefixo nfe:
    const usaPrefixoNfe = config.tagMsg.includes('nfe:');

    // Extrai namespace nfe do xmlnsTagMsg (se tiver)
    const matchNsNfe = config.xmlnsTagMsg.match(/xmlns(:nfe)?="([^"]+)"/);
    const nsNfe = matchNsNfe ? matchNsNfe[2] : null;

    // Monta atributo para declarar xmlns:nfe no Envelope (só se usar prefixo nfe)
    const xmlnsNfeNoEnvelope =
      usaPrefixoNfe && nsNfe ? `xmlns:nfe="${nsNfe}"` : '';

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
      /<retEnvEvento[^>]*>(.*?)<\/retEnvEvento>/s,
    ];

    for (const pattern of patterns) {
      const match = soapResponse.match(pattern);
      if (match && match[1]) return match[1].trim();
    }

    return soapResponse;
  }

  private validarDados(dados: CancelamentoRequestDto): {
    valido: boolean;
    erro?: string;
  } {
    if (!dados.chaveAcesso || dados.chaveAcesso.length !== 44) {
      return {
        valido: false,
        erro: 'Chave de acesso inválida - deve ter 44 dígitos',
      };
    }

    if (!dados.protocolo) {
      return { valido: false, erro: 'Protocolo de autorização é obrigatório' };
    }

    if (!dados.justificativa || dados.justificativa.length < 15) {
      return {
        valido: false,
        erro: 'Justificativa deve ter pelo menos 15 caracteres',
      };
    }

    if (dados.justificativa.length > 255) {
      return {
        valido: false,
        erro: 'Justificativa deve ter no máximo 255 caracteres',
      };
    }

    return { valido: true };
  }
}
