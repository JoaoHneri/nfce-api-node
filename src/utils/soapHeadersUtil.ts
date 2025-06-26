export class SoapHeadersUtil {
    
    static obterCabecalhosEmissaoPorEstado(uf: string, soapEnvelope: string): Record<string, string> {
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

    static obterCabecalhosCancelamentoPorEstado(uf: string, soapEnvelope: string): Record<string, string> {
        const contentLength = Buffer.byteLength(soapEnvelope, 'utf8');
        
        const baseHeaders = {
            'Content-Length': contentLength.toString(),
            'User-Agent': 'NFCe-API/1.0',
            'Accept': '*/*',
            'Connection': 'close'
        };

        console.log(`🎯 Configurando headers de cancelamento para UF: ${uf}`);

        switch (uf) {
            case 'SP': // São Paulo
                console.log(`📋 Usando headers SOAP 1.2 para cancelamento SP`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'PR': // Paraná
                console.log(`📋 Usando headers SOAP 1.1 para cancelamento PR`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };

            case 'RS': // Rio Grande do Sul
                console.log(`📋 Usando headers SOAP 1.1 específicos para cancelamento RS`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };
                
            case 'SC': // Santa Catarina
                console.log(`📋 Usando headers SOAP 1.1 para cancelamento SC`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'MG': // Minas Gerais
                console.log(`📋 Usando headers SOAP 1.2 para cancelamento MG`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
                };

            case 'RJ': // Rio de Janeiro
                console.log(`📋 Usando headers SOAP 1.1 para cancelamento RJ`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };

            default: // Fallback para outros estados
                console.log(`📋 Usando headers SOAP 1.1 padrão para cancelamento ${uf}`);
                return {
                    ...baseHeaders,
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"'
                };
        }
    }
}