import {
  NFCeDataDto,
  CertificadoConfigDto,
  SefazResponseDto,
  CancelamentoRequestDto,
  CacheStatsDto,
} from '../dto';
import { ConsultaHandler } from '../handlers/consultaNfceHandlers';
import { CancelamentoHandler } from '../handlers/cancelamentoHandler';
import { EmissaoNfceHandler } from '../handlers/emissaoNfceHandler';
import { ToolsCache } from '../utils/toolsCache';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SefazNfceService {
  private emissaoHandler: EmissaoNfceHandler;
  private consultaHandler: ConsultaHandler;
  private cancelamentoHandler: CancelamentoHandler;
  private toolsCache: ToolsCache;

  constructor() {
    this.emissaoHandler = new EmissaoNfceHandler();
    this.consultaHandler = new ConsultaHandler();
    this.cancelamentoHandler = new CancelamentoHandler();
    this.toolsCache = new ToolsCache({
      ttl: 30 * 60 * 1000, // 30 minutos
      maxSize: 100, // 100 empresas
      cleanupInterval: 5 * 60 * 1000, // 5 minutos
    });
  }

  async emitirNFCe(
    dados: NFCeDataDto,
    certificadoConfig: CertificadoConfigDto,
  ): Promise<SefazResponseDto> {
    const tools = await this.toolsCache.obterTools(certificadoConfig);
    return await this.emissaoHandler.emitirNFCe(
      tools,
      this.carregarConfigCertificado(certificadoConfig),
      dados,
    );
  }

  async consultarNFCe(chave: string, certificadoConfig: CertificadoConfigDto) {
    const tools = await this.toolsCache.obterTools(certificadoConfig);
    return await this.consultaHandler.consultarNFCe(tools, chave);
  }

  async cancelarNFCe(
    dados: CancelamentoRequestDto,
    certificadoConfig: CertificadoConfigDto,
  ) {
    const tools = await this.toolsCache.obterTools(certificadoConfig);
    return await this.cancelamentoHandler.cancelarNFCe(
      tools,
      this.carregarConfigCertificado(certificadoConfig),
      dados,
    );
  }

  private carregarConfigCertificado(
    certificadoConfig: CertificadoConfigDto,
  ): CertificadoConfigDto {

    return {
      pfx: certificadoConfig.pfx || '',
      senha: certificadoConfig.senha || '',
      CSC: certificadoConfig.CSC || '',
      CSCid: certificadoConfig.CSCid || '',
      CNPJ: certificadoConfig.CNPJ || '',
      CPF: certificadoConfig.CPF || '',
      tpAmb: certificadoConfig.tpAmb || 2, // 1 para produção, 2 para homologação
      UF: certificadoConfig.UF || '', // Sigla do estado, ex: 'SP', 'RJ'
    };
  }

  public obterEstatisticasCache(): CacheStatsDto {
    return this.toolsCache.obterEstatisticas();
  }

  public limparCache() {
    this.toolsCache.limparCache();
  }
}
