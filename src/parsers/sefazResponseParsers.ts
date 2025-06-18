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
            console.log('🔍 Iniciando parse do cancelamento...');

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

            const dadosXML = this.parser.parse(xmlResponse);
            console.log('🔍 XML parseado:', JSON.stringify(dadosXML, null, 2));

            // ✅ CORREÇÃO: Buscar retEvento corretamente
            let retEvento = dadosXML.retEvento;
            
            if (!retEvento) {
                // Se não encontrou retEvento, pode estar em outro lugar
                console.log('🔍 retEvento não encontrado, buscando alternativas...');
                return {
                    sucesso: false,
                    status: "erro_estrutura_resposta",
                    cStat: "999",
                    xMotivo: "Estrutura de resposta não reconhecida",
                    chaveAcesso: chave,
                    xmlCompleto: xmlResponse,
                    erro: "Não foi possível localizar retEvento na resposta"
                };
            }

            if (Array.isArray(retEvento)) {
                retEvento = retEvento[0];
            }

            // Buscar dados no infEvento
            const infEvento = retEvento.infEvento || retEvento;
            const cStat = String(infEvento.cStat || "999");
            const xMotivo = infEvento.xMotivo || "Motivo não informado";
            const nProt = infEvento.nProt;

            console.log('🔍 Dados extraídos:', { cStat, xMotivo, nProt });

            const baseResponse = {
                cStat,
                xMotivo,
                chaveAcesso: chave,
                xmlCompleto: xmlResponse
            };

            // ✅ CORREÇÃO: Status 135 = Cancelamento autorizado
            if (cStat === "135") {
                console.log('✅ Cancelamento autorizado');
                return {
                    ...baseResponse,
                    sucesso: true,
                    status: "cancelado",
                    protocolo: nProt || null
                };
            }
            // Status de erro específico
            else {
                console.log('❌ Cancelamento rejeitado:', xMotivo);
                
                // Identificar tipos específicos de erro
                let status = "erro_cancelamento";
                if (xMotivo.includes("data do evento")) {
                    status = "erro_data_evento";
                } else if (xMotivo.includes("protocolo")) {
                    status = "erro_protocolo";
                } else if (xMotivo.includes("justificativa")) {
                    status = "erro_justificativa";
                }
                
                return {
                    ...baseResponse,
                    sucesso: false,
                    status
                };
            }

        } catch (error: any) {
            console.error('❌ Erro no parse do cancelamento:', error);
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