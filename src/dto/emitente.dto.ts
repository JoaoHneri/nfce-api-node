import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EnderecoDto {
  @IsString()
  xLgr: string;

  @IsString()
  nro: string;

  @IsString()
  xBairro: string;

  @IsString()
  cMun: string;

  @IsString()
  xMun: string;

  @IsString()
  UF: string;

  @IsString()
  CEP: string;

  @IsOptional()
  @IsString()
  cPais?: string;

  @IsOptional()
  @IsString()
  xPais?: string;

  @IsOptional()
  @IsString()
  fone?: string;
}

export class EmitenteDto {
  @IsString()
  CNPJ: string;

  @IsString()
  xNome: string;

  @IsOptional()
  @IsString()
  xFant?: string;

  @IsString()
  IE: string;

  @IsString()
  CRT: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco: EnderecoDto;
}

export class DestinatarioDto {
  @IsOptional()
  @IsString()
  CPF?: string;

  @IsOptional()
  @IsString()
  CNPJ?: string;

  @IsOptional()
  @IsString()
  xNome?: string;

  @IsOptional()
  @IsString()
  indIEDest?: string;
}
