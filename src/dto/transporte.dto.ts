import { IsString } from 'class-validator';

export class TransporteDto {
  @IsString()
  modFrete: string;
}
