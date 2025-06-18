export interface CertificadoConfig {
  pfx: string;
  senha: string;
  CSC: string;
  CSCid: string;
  CNPJ?: string;
  CPF?: string;
  tpAmb?: number; // '1' para produção, '2' para homologação
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
  sucesso: boolean;
  cStat?: string;
  xMotivo?: string;
  chaveAcesso?: string;
  protocolo?: string;
  dataHora?: string;
  qrCode?: string;
  xmlCompleto?: string;
  erro?: string;
}

export interface SefazEndpoints {
  nfceAutorizacao: string;
  nfceConsulta: string;
  nfceStatusServico: string;
  nfceCancelamento: string;
}

export interface ConsultaResponse {
    sucesso: boolean;
    status: string;
    cStat: string;
    xMotivo: string;
    chaveAcesso: string;
    protocolo?: string;
    dataAutorizacao?: string;
    xmlCompleto: string;
    aguardar?: boolean;
    erro?: string;
}
export interface CancelamentoRequest {
    chaveAcesso: string;
    protocolo: string;
    justificativa: string;
}

export interface CancelamentoResponse {
    sucesso: boolean;
    status: string;
    cStat: string;
    xMotivo: string;
    chaveAcesso: string;
    protocolo?: string;
    xmlCompleto: string;
    erro?: string;
}