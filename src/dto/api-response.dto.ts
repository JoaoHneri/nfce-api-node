// src/dto/api-response.dto.ts
import { CacheStatsDto } from './cache-stats.dto';

export interface ApiResponseDto<T = any> {
  sucesso: boolean;
  mensagem: string;
  dados?: T;
  erro?: string;
}

export interface CacheStatsResponseDto extends ApiResponseDto<CacheStatsDto> {
  dados: CacheStatsDto;
}
