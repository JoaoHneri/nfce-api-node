import { IsString } from 'class-validator';

export class CancelamentoRequestDto {
  @IsString()
  chaveAcesso: string;

  @IsString()
  protocolo: string;

  @IsString()
  justificativa: string;
}
