import { XMLParser } from 'fast-xml-parser';
import { ConsultaResponse, CancelamentoResponse } from '../types';

export class SefazResponseParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false });
    }

    parseConsultaResponse(xmlResponse: string, chave: string): ConsultaResponse {
        try {
            const dadosXML = this.parser.parse(xmlResponse);
            const retConsSit = dadosXML.retConsSitNFe;
            const cStat = retConsSit.cStat;
            const xMotivo = retConsSit.xMotivo;

            const baseResponse = {
                cStat,
                xMotivo,
                chaveAcesso: chave,
                xmlCompleto: xmlResponse
            };

            switch (cStat) {
                case "100": // Autorizada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "autorizada",
                        protocolo: retConsSit.protNFe?.infProt?.nProt || null,
                        dataAutorizacao: retConsSit.protNFe?.infProt?.dhRecbto || null
                    };

                case "101": // Cancelada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "cancelada",
                        protocolo: retConsSit.protNFe?.infProt?.nProt || null
                    };

                case "110": // Denegada
                    return {
                        ...baseResponse,
                        sucesso: true,
                        status: "denegada",
                        protocolo: retConsSit.protNFe?.infProt?.nProt || null
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
            const dadosXML = this.parser.parse(xmlResponse);
            const retEvento = dadosXML.retEventoNFe || dadosXML.retEnvEventoNFe;
            const infEvento = retEvento?.infEvento || retEvento?.retEvento?.infEvento;
            
            const cStat = infEvento?.cStat || "999";
            const xMotivo = infEvento?.xMotivo || "Resposta inválida";

            const baseResponse = {
                cStat,
                xMotivo,
                chaveAcesso: chave,
                xmlCompleto: xmlResponse
            };

            // Cancelamento autorizado
            if (cStat === "135") {
                return {
                    ...baseResponse,
                    sucesso: true,
                    status: "cancelado",
                    protocolo: infEvento?.nProt || null
                };
            }
            // Cancelamento rejeitado
            else {
                return {
                    ...baseResponse,
                    sucesso: false,
                    status: "erro_cancelamento"
                };
            }

        } catch (error: any) {
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


}