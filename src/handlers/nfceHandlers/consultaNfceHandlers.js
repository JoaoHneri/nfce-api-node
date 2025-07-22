import { SefazResponseParser } from '../../parsers/sefazResponseParsers.js';
import { MemberService } from "../../services/memberService.js";

export class ConsultaHandler {
    constructor() {
        this.parser = new SefazResponseParser();
        this.memberService = new MemberService();
    }

    async consultarNfce(tools, accessKey) {
        try {
            // 1. Validar chave de acesso
            if (!accessKey || accessKey.length !== 44) {
                return {
                    success: false,
                    error: "Invalid access key - must have 44 digits"
                };
            }

            // 2. Buscar certificado automaticamente
            const xmlResponse = await tools.consultarNFe(accessKey);

            // Parse da resposta
            const resultado = this.parser.parseConsultaResponse(xmlResponse, accessKey);

            if (resultado.success) {
                return {
                    success: true,
                    data: {
                        accessKey,
                        sefaz: {
                            cStat: resultado.cStat,
                            reason: resultado.reason,
                            protocol: resultado.protocol,
                            authorizationDate: resultado.authorizationDate,
                            status: resultado.status
                        },
                        xmlComplete: resultado.xmlComplete
                    }
                };
            } else {
                return {
                    success: false,
                    error: resultado.reason || resultado.error,
                    data: {
                        accessKey,
                        cStat: resultado.cStat,
                        reason: resultado.reason
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
}
