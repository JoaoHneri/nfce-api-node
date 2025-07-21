import { SefazResponseParser } from "../../parsers/sefazResponseParsers";
import { ConsultaResponse, CertificadoConfig } from "../../types";
import { MemberService } from "../../services/memberService";

export class ConsultaHandler {
    private parser: SefazResponseParser;
    private memberService: MemberService;

    constructor() {
        this.parser = new SefazResponseParser();
        this.memberService = new MemberService();
    }

    async consultarNfce(
        tools: any,
        accessKey: string,
    ): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }> {
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

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}