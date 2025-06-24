import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ConsultaResponseDto {
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

  @IsOptional()
  @IsString()
  dataAutorizacao?: string;

  @IsString()
  xmlCompleto: string;

  @IsOptional()
  @IsBoolean()
  aguardar?: boolean;

  @IsOptional()
  @IsString()
  erro?: string;
}
