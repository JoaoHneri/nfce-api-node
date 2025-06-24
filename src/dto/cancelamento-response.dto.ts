import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CancelamentoResponseDto {
  @IsBoolean()
  sucesso: boolean;

  @IsString()
  status: string;

  @IsString()
  cStat: string;

  @IsString()
  xMotivo: string;

  @IsString()
  chaveAcesso: string;

  @IsOptional()
  @IsString()
  protocolo?: string;

  @IsString()
  xmlCompleto: string;

  @IsOptional()
  @IsString()
  erro?: string;
}
