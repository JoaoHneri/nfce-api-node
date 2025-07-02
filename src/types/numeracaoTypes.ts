export interface ConfiguracaoNumeracao {
  cnpj: string;
  uf: string;
  serie: string;
  ambiente: '1' | '2'; // 1 = Produção, 2 = Homologação
}

export interface DadosNumeracao {
  nNF: string;
  cNF: string;
}

export interface HistoricoNumeracao {
  id?: number;
  cnpj: string;
  uf: string;
  serie: string;
  ambiente: '1' | '2';
  nNF: string;
  cNF: string;
  chave_acesso?: string;
  protocolo?: string;
  status: 'RESERVADO' | 'AUTORIZADA' | 'REJEITADA' | 'LIBERADA' | 'CANCELADA';
  motivo?: string;
  created_at?: Date;
  updated_at?: Date;
}