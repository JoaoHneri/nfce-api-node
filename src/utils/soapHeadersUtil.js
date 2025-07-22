export class SoapHeadersUtil {
    
    static obterCabecalhosEmissaoPorEstado(uf, soapEnvelope) {
        const contentLength = Buffer.byteLength(soapEnvelope, 'utf8');
        
        const baseHeaders = {
            'Content-Length': contentLength.toString(),
            'User-Agent': 'NFCe-API/1.0',
            'Accept': '*/*',
            'Connection': 'close'
        };

        switch (uf) {
            case 'SP': // São Paulo
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote'
                };

            case 'PR': // Paraná
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                };

            case 'RS': // Rio Grande do Sul
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                };

            case 'SC': // Santa Catarina
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                };

            case 'MG': // Minas Gerais
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote'
                };

            case 'RJ': // Rio de Janeiro
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                };

            default: // Fallback para outros estados
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                };
        }
    }

    static obterCabecalhosCancelamentoPorEstado(uf, soapEnvelope){
        const contentLength = Buffer.byteLength(soapEnvelope, 'utf8');
        
        const baseHeaders = {
            'Content-Length': contentLength.toString(),
            'User-Agent': 'NFCe-API/1.0',
            'Accept': '*/*',
            'Connection': 'close'
        };

        switch (uf) {
            case 'SP': // São Paulo
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'PR': // Paraná
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };

            case 'RS': // Rio Grande do Sul
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };
                
            case 'SC': // Santa Catarina
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'MG': // Minas Gerais
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'RJ': // Rio de Janeiro
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };

            default: // Fallback para outros estados
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };
        }
    }
}