import { Module } from '@nestjs/common';
import { NfceController } from './nfce.controller';
import { NfceService } from './nfce.service';
import { SefazNfceService } from '../../services/sefazNfceService';
import { EmissaoNfceHandler } from '../../handlers/emissaoNfceHandler';
import { ConsultaHandler } from '../../handlers/consultaNfceHandlers';
import { CancelamentoHandler } from '../../handlers/cancelamentoHandler';
import { SefazResponseParser } from '../../parsers/sefazResponseParsers';
import { ToolsCache } from '../../utils/toolsCache';

@Module({
  controllers: [NfceController],
  providers: [
    NfceService,
    SefazNfceService,
    EmissaoNfceHandler,
    ConsultaHandler,
    CancelamentoHandler,
    SefazResponseParser,
    ToolsCache,
  ],
  exports: [NfceService], // Caso outros módulos precisem usar
})
export class NfceModule {}
