import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NfceModule } from './modules/nfce/nfce.module';

@Module({
  imports: [NfceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
