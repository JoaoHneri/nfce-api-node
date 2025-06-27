export interface CertificadoConfig {
  pfx: string;
  senha: string;
  CSC: string;
  CSCid: string;
  CNPJ?: string;
  CPF?: string;
  tpAmb?: number; // '1' para produção, '2' para homologação
  UF?: string; // Sigla do estado, ex: 'SP', 'RJ'
}

export interface NFCeData {
  // Dados do emitente
  emitente: {
    CNPJ: string;
    xNome: string;
    xFant?: string;
    IE: string;
    CRT: string;
    endereco: {
      xLgr: string;
      nro: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      UF: string;
      CEP: string;
      cPais?: string;
      xPais?: string;
      fone?: string;
    };
  };

  // Dados do destinatário (opcional para NFCe)
  destinatario?: {
    CPF?: string;
    CNPJ?: string;
    xNome?: string;
    indIEDest?: string;
  };

  // Dados da NFCe
  ide: {
    cUF: string;
    cNF: string;
    natOp: string;
    serie: string;
    nNF: string;
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

  // Produtos
  produtos: Array<{
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
  }>;

  // Impostos (simplificado)
  impostos?: {
    orig: string;
    CSOSN: string;
    CST_PIS: string;
    CST_COFINS: string;
  };

  responsavelTecnico?: {
    CNPJ: string;
    xContato: string;
    email: string;
    fone: string;
    idCSRT?: string;
    hashCSRT?: string;
  };
  
  // Pagamento
  pagamento: {
    detPag: Array<{
      indPag: string;
      tPag: string;
      vPag: string;
    }>;
    vTroco?: string;
  };

  // Transporte (opcional)
  transporte?: {
    modFrete: string;
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