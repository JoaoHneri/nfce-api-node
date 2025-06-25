import dotenv from 'dotenv';
dotenv.config();

import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import nfcRoutes from './routes/nfcRoutes';

// Criar instância do Fastify
const app = fastify({ 
  logger: process.env.NODE_ENV !== 'production',
  bodyLimit: 10485760 // 10MB
});

// Rota principal - registrada diretamente na instância principal
app.get('/', async (request: any, reply: any) => {
  return {
    mensagem: 'API NFCe - SEFAZ',
    versao: '1.0.0',
    framework: 'Fastify',
    endpoints: {
      'POST /api/nfce/emitir': 'Emitir NFCe',
      'GET /api/nfce/teste': 'Teste de conectividade',
      'GET /api/nfce/exemplo': 'Obter exemplo de dados',
      'POST /api/nfce/consultar/:chave': 'Consultar NFCe por chave de acesso',
      'POST /api/nfce/cancelar-nfce': 'Cancelar NFCe',
      'GET /api/nfce/cache/stats': 'Estatísticas do cache',
      'POST /api/nfce/cache/limpar': 'Limpar cache'
    }
  };
});

// Registrar plugins
async function registerPlugins() {
  // CORS
  await app.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // Helmet para segurança
  await app.register(require('@fastify/helmet'));

  // Logging middleware
  app.addHook('onRequest', async (request: any, reply: any) => {
    console.log(`${new Date().toISOString()} - ${request.method} ${request.url}`);
  });

  // Registrar rotas da NFCe
  await app.register(nfcRoutes, { prefix: '/api/nfce' });
}

// Handler para rotas não encontradas
app.setNotFoundHandler((request: any, reply: any) => {
  reply.status(404).send({
    sucesso: false,
    mensagem: 'Endpoint não encontrado',
    path: request.url
  });
});

// Handler de erro global
app.setErrorHandler((error: any, request: any, reply: any) => {
  console.error('Erro não tratado:', error);
  
  reply.status(500).send({
    sucesso: false,
    mensagem: 'Erro interno do servidor',
    erro: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Função para iniciar o servidor
async function start() {
  try {
    await registerPlugins();
    
    const PORT = process.env.PORT || 3000;
    
    await app.listen({ 
      port: Number(PORT), 
      host: '0.0.0.0' 
    });
    
    console.log(`API NFCe rodando`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nParando servidor...');
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nParando servidor...');
  await app.close();
  process.exit(0);
});

// Iniciar aplicação
if (require.main === module) {
  start();
}

export default app;
