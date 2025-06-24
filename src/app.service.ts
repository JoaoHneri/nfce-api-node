// filepath: nfce-nestjs-api/src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'NFCe NestJS API - Sistema de emissão de Notas Fiscais de Consumidor Eletrônica';
  }
}
