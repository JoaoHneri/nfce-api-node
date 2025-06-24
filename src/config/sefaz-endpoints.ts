export interface SefazEndpoints {
  nfceAutorizacao: string;
  nfceConsulta: string;
  nfceStatusServico: string;
  nfceCancelamento: string;
}

export const ENDPOINTS_HOMOLOGACAO: Record<string, SefazEndpoints> = {
  SP: {
    nfceAutorizacao:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    nfceConsulta:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    nfceStatusServico:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    nfceCancelamento:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx',
  },
  PR: {
    nfceAutorizacao:
      'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
    nfceConsulta:
      'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4',
    nfceStatusServico:
      'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeStatusServico4',
    nfceCancelamento:
      'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4',
  },
  RS: {
    nfceAutorizacao:
      'https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    nfceConsulta:
      'https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    nfceStatusServico:
      'https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    nfceCancelamento:
      'https://nfce-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
  },
};

export const ENDPOINTS_PRODUCAO: Record<string, SefazEndpoints> = {
  SP: {
    nfceAutorizacao: 'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    nfceConsulta:
      'https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    nfceStatusServico:
      'https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    nfceCancelamento:
      'https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx',
  },
  PR: {
    nfceAutorizacao: 'https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
    nfceConsulta: 'https://nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4',
    nfceStatusServico: 'https://nfce.sefa.pr.gov.br/nfce/NFeStatusServico4',
    nfceCancelamento: 'https://nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4',
  },
  RS: {
    nfceAutorizacao:
      'https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    nfceConsulta:
      'https://nfce.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    nfceStatusServico:
      'https://nfce.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    nfceCancelamento:
      'https://nfce.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
  },
};
