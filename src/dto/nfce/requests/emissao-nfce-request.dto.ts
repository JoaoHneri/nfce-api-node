import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NFCeDataDto } from '../core/nfce-data.dto';
import { CertificadoConfigDto } from '../../auth/certificado-config.dto';

export class EmissaoNFCeRequestDto {
  @ValidateNested()
  @Type(() => NFCeDataDto)
  dadosNFCe: NFCeDataDto;

  @ValidateNested()
  @Type(() => CertificadoConfigDto)
  certificado: CertificadoConfigDto;
}
