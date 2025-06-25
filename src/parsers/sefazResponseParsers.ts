import { XMLParser } from 'fast-xml-parser';
import { ConsultaResponse, CancelamentoResponse } from '../types';

export class SefazResponseParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false });
    }

    parseConsultaResponse(xmlResponse: string, chave: string): ConsultaResponse {
        try {
            // Limpar e extrair XML se estiver dentro de SOAP envelope
            const xmlLimpo = this.extrairXMLdoSOAP(xmlResponse);
            const dadosXML = this.parser.parse(xmlLimpo);
            
            // Tentar diferentes estruturas baseadas no estado/órgão
            let retConsSit = this.encontrarRetConsSitNFe(dadosXML);
            
            if (!retConsSit) {
                throw new Error('Estrutura retConsSitNFe não encontrada no XML');
            }

            const cStat = this.extrairValor(retConsSit, 'cStat');
            const xMotivo = this.extrairValor(retConsSit, 'xMotivo');

            if (!cStat) {
                throw new Error('Campo cStat não encontrado na resposta');
            }

            const baseResponse = {
                cStat,
                xMotivo: xMotivo || 'Motivo não informado',
                chaveAcesso: chave,
                xmlCompleto: xmlResponse
            };

            switch (cStat) {
                case "100": // Autorizada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "autorizada",
                        protocolo: this.extrairProtocolo(retConsSit) || undefined,
                        dataAutorizacao: this.extrairDataAutorizacao(retConsSit) || undefined
                    };

                case "101": // Cancelada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "cancelada",
                        protocolo: this.extrairProtocolo(retConsSit) || undefined
                    };

                case "110": // Denegada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "denegada",
                        protocolo: this.extrairProtocolo(retConsSit) || undefined
                    };

                case "656": // Processando
                    return {
                        ...baseResponse,
                        sucesso: false,
                        status: "processando",
                        aguardar: true
                    };

                case "217": // Não encontrada
                    return {
                        ...baseResponse,
                        sucesso: false,
                        status: "nao_encontrada"
                    };

                default: // Outros erros
                    return {
                        ...baseResponse,
                        sucesso: false,
                        status: "erro"
                    };
            }
        } catch (error: any) {
            return {
                sucesso: false,
                status: "erro_parser",
                cStat: "999",
                xMotivo: "Erro ao processar resposta XML",
                chaveAcesso: chave,
                xmlCompleto: xmlResponse,
                erro: error.message
            };
        }
    }

    parseCancelamentoResponse(xmlResponse: string, chave: string): CancelamentoResponse {
        try {
            if (!xmlResponse) {
                return {
                    sucesso: false,
                    status: "erro_resposta_vazia",
                    cStat: "999",
                    xMotivo: "Resposta vazia da SEFAZ",
                    chaveAcesso: chave,
                    xmlCompleto: "",
                    erro: "XML de resposta está vazio"
                };
            }

            // Limpar XML se estiver em envelope SOAP
            const xmlLimpo = this.extrairXMLdoSOAP(xmlResponse);
            const dadosXML = this.parser.parse(xmlLimpo);

            // Encontrar estrutura de retEvento em diferentes formatos
            let retEvento = this.encontrarRetEvento(dadosXML);
            
            if (!retEvento) {
                return {
                    sucesso: false,
                    status: "erro_estrutura",
                    cStat: "999",
                    xMotivo: "Estrutura retEvento não encontrada",
                    chaveAcesso: chave,
                    xmlCompleto: xmlResponse,
                    erro: "Resposta não contém estrutura retEvento válida"
                };
            }

            const cStat = this.extrairValor(retEvento.infEvento || retEvento, 'cStat');
            const xMotivo = this.extrairValor(retEvento.infEvento || retEvento, 'xMotivo');

            // Se é array, pegar o primeiro elemento
            if (Array.isArray(retEvento)) {
                retEvento = retEvento[0];
            }

            // Buscar dados no infEvento ou diretamente no retEvento
            const infEvento = retEvento.infEvento || retEvento;
            const cStatFinal = cStat || this.extrairValor(infEvento, 'cStat') || "999";
            const xMotivoFinal = xMotivo || this.extrairValor(infEvento, 'xMotivo') || "Motivo não informado";
            const nProt = this.extrairValor(infEvento, 'nProt');

            const baseResponse = {
                cStat: cStatFinal,
                xMotivo: xMotivoFinal,
                chaveAcesso: chave,
                xmlCompleto: xmlResponse
            };

            if (cStatFinal === "135") { // Cancelamento homologado
                return {
                    ...baseResponse,
                    sucesso: true,
                    status: "cancelada",
                    protocolo: nProt || undefined
                };
            } else {
                // Tentar identificar tipo específico de erro
                let status = "erro_cancelamento";
                if (xMotivoFinal.includes("data do evento")) {
                    status = "erro_data_evento";
                } else if (xMotivoFinal.includes("protocolo")) {
                    status = "erro_protocolo";
                } else if (xMotivoFinal.includes("justificativa")) {
                    status = "erro_justificativa";
                }
                
                return {
                    ...baseResponse,
                    sucesso: false,
                    status
                };
            }

        } catch (error: any) {
            console.error('Erro no parse do cancelamento:', error);
            return {
                sucesso: false,
                status: "erro_parser",
                cStat: "999",
                xMotivo: "Erro ao processar resposta de cancelamento",
                chaveAcesso: chave,
                xmlCompleto: xmlResponse,
                erro: error.message
            };
        }
    }

    // ===== MÉTODOS AUXILIARES PARA PARSER ROBUSTO =====

    /**
     * Extrai XML limpo removendo envelope SOAP se presente
     */
    private extrairXMLdoSOAP(xmlResponse: string): string {
        try {
            // Se contém envelope SOAP, extrair o conteúdo interno
            if (xmlResponse.includes('soap:Envelope') || xmlResponse.includes('env:Envelope')) {
                // Regex para extrair conteúdo entre tags do body
                const matches = xmlResponse.match(/<(?:soap:Body|env:Body)[^>]*>(.*?)<\/(?:soap:Body|env:Body)>/s);
                if (matches && matches[1]) {
                    // Extrair o XML interno (retConsSitNFe, retEnviNFe, etc.)
                    const innerContent = matches[1];
                    const innerMatches = innerContent.match(/<(ret\w+)[^>]*>.*?<\/\1>/s);
                    if (innerMatches) {
                        return innerMatches[0];
                    }
                }
            }
            
            // Se não tem envelope SOAP, retornar como está
            return xmlResponse;
        } catch (error) {
            console.warn('Erro ao extrair XML do SOAP, usando XML original:', error);
            return xmlResponse;
        }
    }

    /**
     * Encontra a estrutura retConsSitNFe em diferentes formatos de resposta
     */
    private encontrarRetConsSitNFe(dadosXML: any): any {
        // Tentativas em ordem de prioridade baseadas nos diferentes estados
        const possiveisCaminhos = [
            // Formato padrão direto
            dadosXML.retConsSitNFe,
            
            // Formato com envelope SOAP (alguns estados)
            dadosXML['soap:Envelope']?.['soap:Body']?.retConsSitNFe,
            dadosXML['env:Envelope']?.['env:Body']?.retConsSitNFe,
            
            // Formato com nfeResultMsg (PR, SC)
            dadosXML.nfeResultMsg?.retConsSitNFe,
            
            // Formato aninhado profundo
            dadosXML['env:Envelope']?.['env:Body']?.nfeResultMsg?.retConsSitNFe,
            dadosXML['soap:Envelope']?.['soap:Body']?.nfeResultMsg?.retConsSitNFe,
            
            // Formato alternativo (alguns estados usam estruturas diferentes)
            dadosXML.retConsNFe,
            dadosXML.retConsSitNFCe,
            
            // Fallback: procurar qualquer objeto que tenha cStat
            this.encontrarObjetoComCStat(dadosXML)
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho && this.temCampoCStat(caminho)) {
                return caminho;
            }
        }

        return null;
    }

    /**
     * Encontra estrutura retEvento em diferentes formatos
     */
    private encontrarRetEvento(dadosXML: any): any {
        const possiveisCaminhos = [
            dadosXML.retEvento,
            dadosXML.retEventoNFe,
            dadosXML.nfeResultMsg?.retEvento,
            dadosXML['env:Envelope']?.['env:Body']?.retEvento,
            dadosXML['soap:Envelope']?.['soap:Body']?.retEvento,
            dadosXML['env:Envelope']?.['env:Body']?.nfeResultMsg?.retEvento,
            dadosXML['soap:Envelope']?.['soap:Body']?.nfeResultMsg?.retEvento
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho) {
                return caminho;
            }
        }

        return null;
    }

    /**
     * Procura recursivamente por objetos que contenham cStat
     */
    private encontrarObjetoComCStat(obj: any, maxDepth: number = 5): any {
        if (maxDepth <= 0 || !obj || typeof obj !== 'object') {
            return null;
        }

        // Se o objeto atual tem cStat, retornar ele
        if (this.temCampoCStat(obj)) {
            return obj;
        }

        // Procurar nos filhos
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const resultado = this.encontrarObjetoComCStat(obj[key], maxDepth - 1);
                if (resultado) {
                    return resultado;
                }
            }
        }

        return null;
    }

    /**
     * Verifica se o objeto tem o campo cStat
     */
    private temCampoCStat(obj: any): boolean {
        return obj && (obj.cStat !== undefined || obj['@_cStat'] !== undefined);
    }

    /**
     * Extrai valor de um campo, lidando com diferentes formatos XML
     */
    private extrairValor(obj: any, campo: string): string | null {
        if (!obj) return null;

        // Formato direto
        if (obj[campo] !== undefined) {
            return String(obj[campo]);
        }

        // Formato com atributo @_
        if (obj[`@_${campo}`] !== undefined) {
            return String(obj[`@_${campo}`]);
        }

        // Formato aninhado
        if (obj[campo] && typeof obj[campo] === 'object' && obj[campo]['#text']) {
            return String(obj[campo]['#text']);
        }

        return null;
    }

    /**
     * Extrai protocolo de autorização de diferentes estruturas
     */
    private extrairProtocolo(retConsSit: any): string | null {
        const possiveisCaminhos = [
            retConsSit.protNFe?.infProt?.nProt,
            retConsSit.protNFe?.nProt,
            retConsSit.nProt,
            retConsSit.protocolo,
            // Para respostas de cancelamento
            retConsSit.retEvento?.infEvento?.nProt
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho) {
                return String(caminho);
            }
        }

        return null;
    }

    /**
     * Extrai data de autorização
     */
    private extrairDataAutorizacao(retConsSit: any): string | null {
        const possiveisCaminhos = [
            retConsSit.protNFe?.infProt?.dhRecbto,
            retConsSit.protNFe?.dhRecbto,
            retConsSit.dhRecbto,
            retConsSit.dataAutorizacao
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho) {
                return String(caminho);
            }
        }

        return null;
    }

    /**
     * Debug: Imprime estrutura do XML para análise
     */
    private debugEstrutura(obj: any, prefixo: string = '', maxDepth: number = 3): void {
        if (maxDepth <= 0 || !obj || typeof obj !== 'object') {
            return;
        }

        console.log(`${prefixo}Estrutura do objeto:`);
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const tipo = typeof obj[key];
                console.log(`${prefixo}  ${key}: ${tipo}`);
                
                if (tipo === 'object' && obj[key] && maxDepth > 1) {
                    this.debugEstrutura(obj[key], prefixo + '    ', maxDepth - 1);
                }
            }
        }
    }
}