import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);

  console.log(`🚀 NFCe NestJS API rodando na porta ${PORT}`);
  console.log(`📖 Documentação: http://localhost:${PORT}/api`);
}
void bootstrap();
