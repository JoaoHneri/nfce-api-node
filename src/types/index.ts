export interface CertificadoConfig {
  pfxPath: string;     // era pfx
  password: string;
  consumer_key: string;         // era CSC
  consumer_key_id: string;       // era CSCid
  cnpj?: string;       // era CNPJ
  cpf?: string;        // era CPF
  environment?: number; // era tpAmb - '1' para produção, '2' para homologação
  uf?: string;         // era UF - Sigla do estado, ex: 'SP', 'RJ'
}

export interface NFCeData {
  // Issuer data
  issuer: {
    cnpj: string;        // era CNPJ
    xName: string;       // era xNome
    xFant?: string;
    ie: string;          // era IE
    crt: string;         // era CRT
    address: {
      street: string;        // era xLgr
      number: string;        // era nro
      neighborhood: string;  // era xBairro
      cityCode: string;      // era cMun
      city: string;          // era xMun
      state: string;         // era UF
      zipCode: string;       // era CEP
      cPais?: string;
      xPais?: string;
      phone?: string;        // era fone
    };
  };

  // Recipient data (optional for NFCe)
  recipient?: {
    cpf?: string;        // era CPF
    cnpj?: string;       // era CNPJ
    xName?: string;      // era xNome
    ieInd?: string;      // era indIEDest
  };

  // Dados da NFCe
  ide: {
    cUF: string;
    cNF?: string; // Gerado automaticamente pelo sistema
    natOp: string;
    serie: string;
    nNF?: string; // Gerado automaticamente pelo sistema
    dhEmi?: string;
    tpNF: string;
    idDest: string;
    cMunFG: string;
    tpImp: string;
    tpEmis: string;
    tpAmb: string;
    finNFe: string;
    indFinal: string;
    indPres: string;
    indIntermed?: string;
    procEmi: string;
    verProc: string;
  };

  // Products
  products: Array<{
    cProd: string;
    cEAN?: string;
    xProd: string;
    NCM: string;
    CFOP: string;
    uCom: string;
    qCom: string;
    vUnCom: string;
    vProd: string;
    cEANTrib?: string;
    uTrib: string;
    qTrib: string;
    vUnTrib: string;
    vDesc?: string;
    indTot: string;
    taxes?: {
      // ICMS fields
      orig?: string;
      CSOSN?: string;

      // PIS fields
      cstPis?: string;
      pisPercent?: string;
      pisValue?: string;
      pisQuantity?: string;
      pisQuantityValue?: string;

      // COFINS fields
      cstCofins?: string;
      cofinsPercent?: string;
      cofinsValue?: string;
      cofinsQuantity?: string;
      cofinsQuantityValue?: string;

      // Base calculation value (when using percentage)
      baseValue?: string;

      // Taxation mode
      mode?: 'auto' | 'manual';
    };
  }>;


  technicalResponsible?: {
    CNPJ: string;
    xContact: string;
    email: string;
    phone: string;
    idCSRT?: string;
    hashCSRT?: string;
  };

  // Payment
  payment: {
    detPag: Array<{
      indPag: string;
      tPag: string;
      vPag: string;
    }>;
    change?: string;     // era vTroco
  };

  // Transport (optional)
  transport?: {
    mode: string;        // era modFrete
  };
}

export interface SefazResponse {
  success: boolean;
  cStat?: string;
  reason?: string;
  accessKey?: string;
  protocol?: string;
  dateTime?: string;
  qrCode?: string;
  xmlComplete?: string;
  xmlSigned?: string;
  error?: string;
}

export interface SefazEndpoints {
  nfceAutorizacao: string;
  nfceConsulta: string;
  nfceStatusServico: string;
  nfceCancelamento: string;
}

export interface ConsultaResponse {
  success: boolean;
  status: string;
  cStat: string;
  reason: string;
  accessKey: string;
  protocol?: string;
  authorizationDate?: string;
  xmlComplete: string;
  waitRequired?: boolean;
  error?: string;
}
export interface CancelamentoRequest {
  accessKey: string;
  protocol: string;
  justification: string;
}

export interface CancelamentoResponse {
  success: boolean;
  status: string;
  cStat: string;
  reason: string;
  accessKey: string;
  protocol?: string;
  xmlComplete: string;
  error?: string;
}