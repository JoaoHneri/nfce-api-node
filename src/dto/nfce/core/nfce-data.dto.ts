import { IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { EmitenteDto, DestinatarioDto } from './emitente.dto';
import { IdeDto } from './ide.dto';
import { ProdutoDto } from './produto.dto';
import { ImpostosDto } from './impostos.dto';
import { PagamentoDto } from './pagamento.dto';
import { TransporteDto } from './transporte.dto';

export class NFCeDataDto {
  @ValidateNested()
  @Type(() => EmitenteDto)
  emitente: EmitenteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DestinatarioDto)
  destinatario?: DestinatarioDto;

  @ValidateNested()
  @Type(() => IdeDto)
  ide: IdeDto;

  @ValidateNested({ each: true })
  @Type(() => ProdutoDto)
  @IsArray()
  produtos: ProdutoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ImpostosDto)
  impostos?: ImpostosDto;

  @ValidateNested()
  @Type(() => PagamentoDto)
  pagamento: PagamentoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransporteDto)
  transporte?: TransporteDto;
}
