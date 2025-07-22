import { XMLParser } from 'fast-xml-parser';

export class SefazResponseParser {
    constructor() {
        this.parser = new XMLParser({ ignoreAttributes: false });
    }

    parseConsultaResponse(xmlResponse, chave) {
        try {
            const xmlLimpo = this.extrairXMLdoSOAP(xmlResponse);
            const dadosXML = this.parser.parse(xmlLimpo);
            let retConsSit = this.encontrarRetConsSitNFe(dadosXML);

            if (!retConsSit) {
                throw new Error('Structure retConsSitNFe not found in XML');
            }

            const cStat = this.extrairValor(retConsSit, 'cStat');
            const xMotivo = this.extrairValor(retConsSit, 'xMotivo');

            if (!cStat) {
                throw new Error('Field cStat not found in response');
            }

            const baseResponse = {
                cStat,
                reason: xMotivo || 'Reason not informed',
                accessKey: chave,
                xmlComplete: xmlResponse
            };

            switch (cStat) {
                case "100":
                    return {
                        ...baseResponse,
                        success: true,
                        status: "authorized",
                        protocol: this.extrairProtocolo(retConsSit) || undefined,
                        authorizationDate: this.extrairDataAutorizacao(retConsSit) || undefined
                    };
                case "101":
                    return {
                        ...baseResponse,
                        success: true,
                        status: "canceled",
                        protocol: this.extrairProtocolo(retConsSit) || undefined
                    };
                case "110":
                    return {
                        ...baseResponse,
                        success: true,
                        status: "denied",
                        protocol: this.extrairProtocolo(retConsSit) || undefined
                    };
                case "656":
                    return {
                        ...baseResponse,
                        success: false,
                        status: "processing",
                        waitRequired: true
                    };
                case "217":
                    return {
                        ...baseResponse,
                        success: false,
                        status: "not_found"
                    };
                default:
                    return {
                        ...baseResponse,
                        success: false,
                        status: "error"
                    };
            }
        } catch (error) {
            return {
                success: false,
                status: "parser_error",
                cStat: "999",
                reason: "Error processing XML response",
                accessKey: chave,
                xmlComplete: xmlResponse,
                error: error.message
            };
        }
    }

    parseCancelamentoResponse(xmlResponse, chave) {
        try {
            if (!xmlResponse) {
                return {
                    success: false,
                    status: "empty_response_error",
                    cStat: "999",
                    reason: "Empty SEFAZ response",
                    accessKey: chave,
                    xmlComplete: "",
                    error: "Response XML is empty"
                };
            }

            const xmlLimpo = this.extrairXMLdoSOAP(xmlResponse);
            const dadosXML = this.parser.parse(xmlLimpo);

            let retEvento = this.encontrarRetEvento(dadosXML);

            if (!retEvento) {
                return {
                    success: false,
                    status: "structure_error",
                    cStat: "999",
                    reason: "Structure retEvento not found",
                    accessKey: chave,
                    xmlComplete: xmlResponse,
                    error: "Response does not contain valid retEvento structure"
                };
            }

            const cStat = this.extrairValor(retEvento.infEvento || retEvento, 'cStat');
            const xMotivo = this.extrairValor(retEvento.infEvento || retEvento, 'xMotivo');

            if (Array.isArray(retEvento)) {
                retEvento = retEvento[0];
            }

            const infEvento = retEvento.infEvento || retEvento;
            const cStatFinal = cStat || this.extrairValor(infEvento, 'cStat') || "999";
            const xMotivoFinal = xMotivo || this.extrairValor(infEvento, 'xMotivo') || "Motivo não informado";
            const nProt = this.extrairValor(infEvento, 'nProt');

            const baseResponse = {
                cStat: cStatFinal,
                reason: xMotivoFinal,
                accessKey: chave,
                xmlComplete: xmlResponse
            };

            if (cStatFinal === "135") {
                return {
                    ...baseResponse,
                    success: true,
                    status: "canceled",
                    protocol: nProt || undefined
                };
            } else {
                let status = "cancellation_error";
                if (xMotivoFinal.includes("data do evento")) {
                    status = "invalid_date";
                } else if (xMotivoFinal.includes("protocolo")) {
                    status = "invalid_protocol";
                } else if (xMotivoFinal.includes("justificativa")) {
                    status = "invalid_justification";
                }

                return {
                    ...baseResponse,
                    success: false,
                    status,
                    error: `Cancellation error: ${xMotivoFinal}`
                };
            }

        } catch (error) {
            return {
                success: false,
                status: "parser_error",
                cStat: "999",
                reason: "Error processing cancellation response",
                accessKey: chave,
                xmlComplete: xmlResponse,
                error: error.message
            };
        }
    }

    extrairXMLdoSOAP(xmlResponse) {
        try {
            if (xmlResponse.includes('soap:Envelope') || xmlResponse.includes('env:Envelope')) {
                const matches = xmlResponse.match(/<(?:soap:Body|env:Body)[^>]*>(.*?)<\/(?:soap:Body|env:Body)>/s);
                if (matches && matches[1]) {
                    const innerContent = matches[1];
                    const innerMatches = innerContent.match(/<(ret\w+)[^>]*>.*?<\/\1>/s);
                    if (innerMatches) {
                        return innerMatches[0];
                    }
                }
            }
            return xmlResponse;
        } catch (error) {
            return xmlResponse;
        }
    }

    encontrarRetConsSitNFe(dadosXML) {
        const possiveisCaminhos = [
            dadosXML.retConsSitNFe,
            dadosXML['soap:Envelope']?.['soap:Body']?.retConsSitNFe,
            dadosXML['env:Envelope']?.['env:Body']?.retConsSitNFe,
            dadosXML.nfeResultMsg?.retConsSitNFe,
            dadosXML['env:Envelope']?.['env:Body']?.nfeResultMsg?.retConsSitNFe,
            dadosXML['soap:Envelope']?.['soap:Body']?.nfeResultMsg?.retConsSitNFe,
            dadosXML.retConsNFe,
            dadosXML.retConsSitNFCe,
            this.encontrarObjetoComCStat(dadosXML)
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho && this.temCampoCStat(caminho)) {
                return caminho;
            }
        }

        return null;
    }

    encontrarRetEvento(dadosXML) {
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

    encontrarObjetoComCStat(obj, maxDepth = 5) {
        if (maxDepth <= 0 || !obj || typeof obj !== 'object') {
            return null;
        }
        if (this.temCampoCStat(obj)) {
            return obj;
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const resultado = this.encontrarObjetoComCStat(obj[key], maxDepth - 1);
                if (resultado) {
                    return resultado;
                }
            }
        }
        return null;
    }

    temCampoCStat(obj) {
        return obj && (obj.cStat !== undefined || obj['@_cStat'] !== undefined);
    }

    extrairValor(obj, campo) {
        if (!obj) return null;
        if (obj[campo] !== undefined) {
            return String(obj[campo]);
        }
        if (obj[`@_${campo}`] !== undefined) {
            return String(obj[`@_${campo}`]);
        }
        if (obj[campo] && typeof obj[campo] === 'object' && obj[campo]['#text']) {
            return String(obj[campo]['#text']);
        }
        return null;
    }

    extrairProtocolo(retConsSit) {
        const possiveisCaminhos = [
            retConsSit.protNFe?.infProt?.nProt,
            retConsSit.protNFe?.nProt,
            retConsSit.nProt,
            retConsSit.protocolo,
            retConsSit.retEvento?.infEvento?.nProt
        ];

        for (const caminho of possiveisCaminhos) {
            if (caminho) {
                return String(caminho);
            }
        }

        return null;
    }

    extrairDataAutorizacao(retConsSit) {
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
}
