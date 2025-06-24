import { IsString, IsOptional } from 'class-validator';

export class IdeDto {
  @IsString()
  cUF: string;

  @IsString()
  cNF: string;

  @IsString()
  natOp: string;

  @IsString()
  serie: string;

  @IsString()
  nNF: string;

  @IsOptional()
  @IsString()
  dhEmi?: string;

  @IsString()
  tpNF: string;

  @IsString()
  idDest: string;

  @IsString()
  cMunFG: string;

  @IsString()
  tpImp: string;

  @IsString()
  tpEmis: string;

  @IsString()
  tpAmb: string;

  @IsString()
  finNFe: string;

  @IsString()
  indFinal: string;

  @IsString()
  indPres: string;

  @IsOptional()
  @IsString()
  indIntermed?: string;

  @IsString()
  procEmi: string;

  @IsString()
  verProc: string;
}
