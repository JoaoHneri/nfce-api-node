import { IsNumber, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CacheEmpresaDto {
  @IsString()
  empresa: string;

  @IsNumber()
  hits: number;

  @IsString()
  idade: string;

  @IsString()
  expiraEm: string;
}

export class CacheStatsDto {
  @IsNumber()
  totalEmpresas: number;

  @IsNumber()
  maxSize: number;

  @IsNumber()
  ttlSeconds: number;

  @ValidateNested({ each: true })
  @Type(() => CacheEmpresaDto)
  @IsArray()
  empresas: CacheEmpresaDto[];
}
