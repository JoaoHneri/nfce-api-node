import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SefazResponseDto {
  @IsBoolean()
  sucesso: boolean;

  @IsOptional()
  @IsString()
  cStat?: string;

  @IsOptional()
  @IsString()
  xMotivo?: string;

  @IsOptional()
  @IsString()
  chaveAcesso?: string;

  @IsOptional()
  @IsString()
  protocolo?: string;

  @IsOptional()
  @IsString()
  dataHora?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsString()
  xmlCompleto?: string;

  @IsOptional()
  @IsString()
  erro?: string;
}
