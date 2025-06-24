import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NFCeDataDto } from './nfce-data.dto';
import { CertificadoConfigDto } from './certificado-config.dto';

export class EmissaoNFCeRequestDto {
  @ValidateNested()
  @Type(() => NFCeDataDto)
  dadosNFCe: NFCeDataDto;

  @ValidateNested()
  @Type(() => CertificadoConfigDto)
  certificado: CertificadoConfigDto;
}
