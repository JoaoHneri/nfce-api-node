import { IsString } from 'class-validator';

export class ImpostosDto {
  @IsString()
  orig: string;

  @IsString()
  CSOSN: string;

  @IsString()
  CST_PIS: string;

  @IsString()
  CST_COFINS: string;
}
