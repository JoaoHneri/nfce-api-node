import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { ConsultaResponse } from "../types";

export class ConsultaHandler {
    private parser: SefazResponseParser;

    constructor() {
        this.parser = new SefazResponseParser();
    }

    async consultarNFCe(tools: any, chave: string): Promise<ConsultaResponse> {
        try {
            // Validação da chave
            if (!chave || chave.length !== 44) {
                return {
                    sucesso: false,
                    status: "erro_validacao",
                    cStat: "999",
                    xMotivo: "Chave de acesso inválida - deve ter 44 dígitos",
                    chaveAcesso: chave,
                    xmlCompleto: "",
                    erro: "Chave inválida"
                };
            }

            // Consulta na SEFAZ
            const xmlResponse = await tools.consultarNFe(chave);
            
            // Parse da resposta
            return this.parser.parseConsultaResponse(xmlResponse, chave);

        } catch (error: any) {
            return {
                sucesso: false,
                status: "erro_comunicacao",
                cStat: "999",
                xMotivo: "Erro de comunicação com SEFAZ",
                chaveAcesso: chave,
                xmlCompleto: "",
                erro: error.message
            };
        }
    }
}