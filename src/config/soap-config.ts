// src/config/soap-config.ts

export interface SOAPConfig {
  protocoloSOAP: 'soap' | 'soap12';
  envelopePrefixo: string;
  tagMsg: string;
  xmlnsTagMsg: string;
  namespaceCabecalho?: string;
}

export interface SOAPConfigPorOperacao {
  autorizacao: SOAPConfig;
  cancelamento: SOAPConfig;
}

export const CONFIG_SOAP_POR_UF: Record<string, SOAPConfigPorOperacao> = {
  '35': {
    // SP
    autorizacao: {
      protocoloSOAP: 'soap12',
      envelopePrefixo: 'soap12',
      tagMsg: 'nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"',
      namespaceCabecalho:
        'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
    },
    cancelamento: {
      protocoloSOAP: 'soap12',
      envelopePrefixo: 'soap',
      tagMsg: 'nfe:nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"',
    },
  },
  '41': {
    // PR
    autorizacao: {
      protocoloSOAP: 'soap',
      envelopePrefixo: 'soap',
      tagMsg: 'nfe:nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"',
      namespaceCabecalho:
        'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
    },
    cancelamento: {
      protocoloSOAP: 'soap',
      envelopePrefixo: 'soap',
      tagMsg: 'nfe:nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/RecepcaoEvento4"',
    },
  },
  '43': {
    // RS
    autorizacao: {
      protocoloSOAP: 'soap',
      envelopePrefixo: 'soap',
      tagMsg: 'nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"',
      namespaceCabecalho:
        'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
    },
    cancelamento: {
      protocoloSOAP: 'soap',
      envelopePrefixo: 'soap',
      tagMsg: 'nfeDadosMsg',
      xmlnsTagMsg:
        'xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/RecepcaoEvento4"',
    },
  },
};

export function obterConfigSOAP(
  cUF: string,
  operacao: 'autorizacao' | 'cancelamento',
): SOAPConfig {
  const configUF = CONFIG_SOAP_POR_UF[cUF];
  if (!configUF) {
    throw new Error(`UF ${cUF} não suportada para operação ${operacao}.`);
  }

  return configUF[operacao];
}

export function obterNamespaceSOAP(protocoloSOAP: 'soap' | 'soap12'): string {
  return protocoloSOAP === 'soap12'
    ? 'http://www.w3.org/2003/05/soap-envelope'
    : 'http://schemas.xmlsoap.org/soap/envelope/';
}
