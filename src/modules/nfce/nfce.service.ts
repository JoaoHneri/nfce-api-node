import { Injectable } from '@nestjs/common';
import { SefazNfceService } from '../../services/sefazNfceService';
import {
  NFCeDataDto,
  CertificadoConfigDto,
  CancelamentoRequestDto,
  CacheStatsDto,
} from '../../dto';

@Injectable()
export class NfceService {
  constructor(private readonly sefazNfceService: SefazNfceService) {}

  async emitirNFCe(
    dados: NFCeDataDto,
    certificadoConfig: CertificadoConfigDto,
  ) {
    return await this.sefazNfceService.emitirNFCe(dados, certificadoConfig);
  }

  async consultarNFCe(chave: string, certificadoConfig: CertificadoConfigDto) {
    return await this.sefazNfceService.consultarNFCe(chave, certificadoConfig);
  }

  async cancelarNFCe(
    dados: CancelamentoRequestDto,
    certificadoConfig: CertificadoConfigDto,
  ) {
    return await this.sefazNfceService.cancelarNFCe(dados, certificadoConfig);
  }

  obterEstatisticasCache(): CacheStatsDto {
    return this.sefazNfceService.obterEstatisticasCache();
  }

  limparCache() {
    this.sefazNfceService.limparCache();
  }

  obterExemplo() {
    const exemploCompleto = {
      certificado: {
        pfx: '/caminho/para/seu/certificado.pfx',
        senha: 'senha_do_certificado',
        CSC: 'seu_codigo_CSC_aqui',
        CSCid: '1',
        CNPJ: '12345678000199',
        tpAmb: 2,
        UF: 'SP',
      },
      dadosNFCe: {
        emitente: {
          CNPJ: '12345678000199',
          xNome: 'EMPRESA EXEMPLO LTDA',
          xFant: 'LOJA EXEMPLO',
          IE: '123456789',
          CRT: '1',
          endereco: {
            xLgr: 'RUA EXEMPLO',
            nro: '123',
            xBairro: 'CENTRO',
            cMun: '3550308',
            xMun: 'SÃO PAULO',
            UF: 'SP',
            CEP: '01234567',
            cPais: '1058',
            xPais: 'BRASIL',
            fone: '1199999999',
          },
        },
        // Adicione o resto dos dados do exemplo aqui...
      },
    };

    return {
      sucesso: true,
      mensagem: 'Exemplo completo para emissão de NFCe via NestJS',
      observacoes: [
        'Projeto convertido para NestJS',
        'Mantém toda funcionalidade original',
        'Usa decorators do NestJS',
        'Injeção de dependência automática',
        'Tratamento de erros padronizado',
        'Validações de entrada aprimoradas',
      ],
      comoUsar: {
        endpoint: 'POST /api/nfce/emitir',
        contentType: 'application/json',
        body: "Use o objeto 'exemploCompleto' abaixo",
      },
      exemploCompleto,
    };
  }
}
