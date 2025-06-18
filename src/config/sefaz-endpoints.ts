export interface SefazEndpoints {
  nfceAutorizacao: string;
  nfceConsulta: string;
  nfceStatusServico: string;
  nfceCancelamento: string;
}

export const ENDPOINTS_HOMOLOGACAO: Record<string, SefazEndpoints> = {
  'SP': {
    nfceAutorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    nfceConsulta: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    nfceStatusServico: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    nfceCancelamento: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx'
  }
};

export const ENDPOINTS_PRODUCAO: Record<string, SefazEndpoints> = {
  'SP': {
    nfceAutorizacao: 'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    nfceConsulta: 'https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    nfceStatusServico: 'https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    nfceCancelamento: 'https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx'
  }
};
