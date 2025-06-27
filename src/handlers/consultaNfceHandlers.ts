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
                    success: false,
                    status: "validation_error",
                    cStat: "999",
                    reason: "Invalid access key - must have 44 digits",
                    accessKey: chave,
                    xmlComplete: "",
                    error: "Invalid key"
                };
            }

            // Consulta na SEFAZ
            const xmlResponse = await tools.consultarNFe(chave);
            
            // Parse da resposta
            return this.parser.parseConsultaResponse(xmlResponse, chave);

        } catch (error: any) {
            return {
                success: false,
                status: "communication_error",
                cStat: "999",
                reason: "SEFAZ communication error",
                accessKey: chave,
                xmlComplete: "",
                error: error.message
            };
        }
    }
}