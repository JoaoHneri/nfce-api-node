import { IsString, IsOptional } from 'class-validator';

export class ProdutoDto {
  @IsString()
  cProd: string;

  @IsOptional()
  @IsString()
  cEAN?: string;

  @IsString()
  xProd: string;

  @IsString()
  NCM: string;

  @IsString()
  CFOP: string;

  @IsString()
  uCom: string;

  @IsString()
  qCom: string;

  @IsString()
  vUnCom: string;

  @IsString()
  vProd: string;

  @IsOptional()
  @IsString()
  cEANTrib?: string;

  @IsString()
  uTrib: string;

  @IsString()
  qTrib: string;

  @IsString()
  vUnTrib: string;

  @IsOptional()
  @IsString()
  vDesc?: string;

  @IsString()
  indTot: string;
}
