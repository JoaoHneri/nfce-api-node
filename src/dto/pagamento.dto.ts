import { IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class DetPagDto {
  @IsString()
  indPag: string;

  @IsString()
  tPag: string;

  @IsString()
  vPag: string;
}

export class PagamentoDto {
  @ValidateNested({ each: true })
  @Type(() => DetPagDto)
  @IsArray()
  detPag: DetPagDto[];

  @IsOptional()
  @IsString()
  vTroco?: string;
}
