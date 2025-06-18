import { SefazResponseParser } from "../parsers/sefazResponseParsers";
import { CancelamentoRequest, CancelamentoResponse } from "../types";

export class CancelamentoHandler {
    private parser: SefazResponseParser;

    constructor() {
        this.parser = new SefazResponseParser();
    }

    async cancelarNFCe(tools: any, dados: CancelamentoRequest): Promise<CancelamentoResponse> {
        try {
            // Validações
            const validacao = this.validarDados(dados);
            if (!validacao.valido) {
                return {
                    sucesso: false,
                    status: "erro_validacao",
                    cStat: "999",
                    xMotivo: validacao.erro!,
                    chaveAcesso: dados.chaveAcesso,
                    xmlCompleto: "",
                    erro: validacao.erro
                };
            }

            // Cancelamento via SEFAZ
            const xmlResponse = await tools.sefazEvento({
                chNFe: dados.chaveAcesso,
                tpEvento: "110111", // Tipo de evento: Cancelamento
                nProt: dados.protocolo,
                justificativa: dados.justificativa
            });

            // Parse da resposta
            return this.parser.parseCancelamentoResponse(xmlResponse, dados.chaveAcesso);

        } catch (error: any) {
            return {
                sucesso: false,
                status: "erro_comunicacao",
                cStat: "999",
                xMotivo: "Erro de comunicação com SEFAZ",
                chaveAcesso: dados.chaveAcesso,
                xmlCompleto: "",
                erro: error.message
            };
        }
    }

    private validarDados(dados: CancelamentoRequest): { valido: boolean; erro?: string } {
        if (!dados.chaveAcesso || dados.chaveAcesso.length !== 44) {
            return { valido: false, erro: "Chave de acesso inválida - deve ter 44 dígitos" };
        }

        if (!dados.protocolo) {
            return { valido: false, erro: "Protocolo de autorização é obrigatório" };
        }

        if (!dados.justificativa || dados.justificativa.length < 15) {
            return { valido: false, erro: "Justificativa deve ter pelo menos 15 caracteres" };
        }

        if (dados.justificativa.length > 255) {
            return { valido: false, erro: "Justificativa deve ter no máximo 255 caracteres" };
        }

        return { valido: true };
    }
}