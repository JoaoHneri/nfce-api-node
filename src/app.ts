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
    message: 'API NFCe - SEFAZ',
    version: '1.0.0',
    framework: 'Fastify',
    endpoints: {
      'POST /api/nfce/create-nfc': 'Issue NFCe',
      'GET /api/nfce/test': 'Connectivity test',
      'GET /api/nfce/example': 'Get data example',
      'POST /api/nfce/consult/:accessKey': 'Query NFCe by access key',
      'POST /api/nfce/cancel-nfc': 'Cancel NFCe',
      'GET /api/nfce/cache/stats': 'Cache statistics',
      'DELETE /api/nfce/cache/clear': 'Clear cache',
      'GET /api/nfce/tax/:crt/:cst': 'Tax consultation',
      'GET /api/nfce/tax/regimes': 'List tax regimes',
      'GET /api/nfce/tax/simulate/:crt/:cstpis/:cstcofins/:valor': 'Tax simulation',
      'GET /api/nfce/tax/report': 'Tax report',
      'GET /api/nfce/tax/validate-cst/:cst': 'Validate CST'
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
    success: false,
    message: 'Endpoint not found',
    path: request.url
  });
});

// Handler de erro global
app.setErrorHandler((error: any, request: any, reply: any) => {
  console.error('Erro não tratado:', error);
  
  reply.status(500).send({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
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
