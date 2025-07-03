import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { ConsultaResponse, CertificadoConfig } from "../types";
import { MemberService } from "../services/memberService";

export class ConsultaHandler {
    private parser: SefazResponseParser;
    private memberService: MemberService;

    constructor() {
        this.parser = new SefazResponseParser();
        this.memberService = new MemberService();
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

    // ✅ Método para consulta usando apenas CNPJ
    async consultarNFCePorCNPJ(
        accessKey: string,
        memberCnpj: string,
        environment: number,
        sefazService: any
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
            const certificateData = await this.memberService.buscarCertificadoPorCNPJ(memberCnpj, environment);
            
            if (!certificateData) {
                return {
                    success: false,
                    error: `No active certificate found for CNPJ: ${memberCnpj} in environment: ${environment}`
                };
            }

            // 3. Preparar configuração do certificado
            const certificateConfig: CertificadoConfig = {
                pfxPath: certificateData.pfxPath,
                password: certificateData.password,
                csc: certificateData.csc,
                cscId: certificateData.cscId,
                cnpj: memberCnpj,
                environment: parseInt(certificateData.environment),
                uf: certificateData.uf
            };

            // 4. Obter tools e executar consulta
            const tools = await sefazService.obterTools(certificateConfig);
            const resultado = await this.consultarNFCe(tools, accessKey);

            if (resultado.success) {
                return {
                    success: true,
                    data: {
                        accessKey,
                        company: {
                            cnpj: memberCnpj
                        },
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