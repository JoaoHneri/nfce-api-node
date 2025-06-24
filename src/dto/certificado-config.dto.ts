import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CertificadoConfigDto {
  @IsString()
  pfx: string;

  @IsString()
  senha: string;

  @IsString()
  CSC: string;

  @IsString()
  CSCid: string;

  @IsOptional()
  @IsString()
  CNPJ?: string;

  @IsOptional()
  @IsString()
  CPF?: string;

  @IsOptional()
  @IsNumber()
  tpAmb?: number; // '1' para produção, '2' para homologação

  @IsOptional()
  @IsString()
  UF?: string; // Sigla do estado, ex: 'SP', 'RJ'
}
