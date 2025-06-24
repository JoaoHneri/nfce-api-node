import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpException,
  HttpCode,
} from '@nestjs/common';
import { NfceService } from './nfce.service';
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  constructor(private readonly nfceService: NfceService) {}

  @Post('emitir')
  @HttpCode(HttpStatus.OK)
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto): Promise<any> {
    try {
      const { dadosNFCe, certificado } = body;

      if (!this.validarCertificado(certificado)) {
        throw new HttpException(
          'Dados do certificado são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      const resultado = await this.nfceService.emitirNFCe(
        dadosNFCe,
        certificado,
      );

      if (resultado.sucesso) {
        return {
          sucesso: true,
          mensagem: 'NFCe emitida com sucesso',
          dados: {
            chaveAcesso: resultado.chaveAcesso,
            protocolo: resultado.protocolo,
            dataHora: resultado.dataHora,
            status: resultado.cStat,
            motivo: resultado.xMotivo,
          },
        };
      } else {
        throw new HttpException(
          {
            sucesso: false,
            mensagem: 'Erro na emissão da NFCe',
            erro: resultado.xMotivo || resultado.erro,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new HttpException(
        {
          sucesso: false,
          mensagem: 'Erro interno do servidor',
          erro: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('consultar/:chave')
  async consultarNFCe(
    @Param('chave') chave: string,
    @Body() body: { certificado: CertificadoConfigDto },
  ) {
    try {
      const { certificado } = body;

      if (!this.validarCertificado(certificado)) {
        throw new HttpException(
          'Dados do certificado são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!chave || chave.length !== 44) {
        throw new HttpException(
          'Chave de acesso inválida. Deve ter 44 dígitos',
          HttpStatus.BAD_REQUEST,
        );
      }

      const resultado = await this.nfceService.consultarNFCe(
        chave,
        certificado,
      );
      return { resultado };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new HttpException(
        {
          erro: 'Erro interno do servidor',
          mensagem: 'Erro inesperado ao consultar NFCe',
          detalhes: {
            erro: errorMessage,
            timestamp: new Date().toISOString(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cancelar')
  @HttpCode(HttpStatus.OK)
  async cancelarNFCe(
    @Body()
    body: {
      chaveAcesso: string;
      protocolo: string;
      justificativa: string;
      certificado: CertificadoConfigDto;
    },
  ) {
    try {
      const { chaveAcesso, protocolo, justificativa, certificado } = body;

      if (!this.validarCertificado(certificado)) {
        throw new HttpException(
          'Dados do certificado são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!chaveAcesso || !protocolo || !justificativa) {
        throw new HttpException(
          {
            erro: 'Dados obrigatórios',
            mensagem: 'chaveAcesso, protocolo e justificativa são obrigatórios',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (justificativa.length < 15) {
        throw new HttpException(
          'Justificativa deve ter pelo menos 15 caracteres',
          HttpStatus.BAD_REQUEST,
        );
      }

      const dadosCancelamento: CancelamentoRequestDto = {
        chaveAcesso,
        protocolo,
        justificativa,
      };

      const resultado = await this.nfceService.cancelarNFCe(
        dadosCancelamento,
        certificado,
      );
      return resultado;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new HttpException(
        {
          erro: 'Erro interno do servidor',
          mensagem: 'Erro inesperado ao cancelar NFCe',
          detalhes: {
            erro: errorMessage,
            timestamp: new Date().toISOString(),
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('exemplo')
  obterExemplo() {
    return this.nfceService.obterExemplo();
  }

  @Get('cache/stats')
  obterEstatisticasCache(): CacheStatsResponseDto {
    try {
      const stats = this.nfceService.obterEstatisticasCache();
      return {
        sucesso: true,
        mensagem: 'Estatísticas do cache de Tools',
        dados: stats,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new HttpException(
        {
          sucesso: false,
          erro: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/limpar')
  @HttpCode(HttpStatus.OK)
  limparCacheManual() {
    try {
      this.nfceService.limparCache();
      return {
        sucesso: true,
        mensagem: 'Cache limpo com sucesso',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new HttpException(
        {
          sucesso: false,
          erro: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('teste')
  testeConectividade() {
    return {
      sucesso: true,
      mensagem: 'NestJS NFCe API funcionando corretamente',
      dados: {
        timestamp: new Date().toISOString(),
        versao: '1.0.0',
        framework: 'NestJS',
        ambiente: process.env.NODE_ENV || 'development',
        endpoints: [
          'POST /api/nfce/emitir',
          'GET /api/nfce/consultar/:chave',
          'POST /api/nfce/cancelar',
          'GET /api/nfce/exemplo',
          'GET /api/nfce/cache/stats',
          'POST /api/nfce/cache/limpar',
        ],
      },
    };
  }

  private validarCertificado(certificado: CertificadoConfigDto): boolean {
    if (!certificado) return false;

    const camposObrigatorios: (keyof CertificadoConfigDto)[] = [
      'pfx',
      'senha',
      'CSC',
      'CSCid',
    ];
    return camposObrigatorios.every((campo) => certificado[campo]);
  }
}
