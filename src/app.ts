import dotenv from 'dotenv';
dotenv.config();

import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import routes from './routes/routes';

// Criar instância do Fastify
const app = fastify({ 
  logger: process.env.NODE_ENV !== 'production',
  bodyLimit: 10485760 // 10MB
});

// Rota principal - registrada diretamente na instância principal
app.get('/', async (request: any, reply: any) => {
  return {
    message: 'API NFCe - SEFAZ (Unified)',
    version: '2.0.0',
    framework: 'Fastify',
    note: '🆕 Now using unified routes for all note types',
    endpoints: {
      'POST /api/notes/:type/issue': 'Issue notes (nfce, nfe, nfse)',
      'GET /api/notes/:type/consult/:accessKey/:memberCnpj/:environment': 'Query notes by access key',
      'POST /api/notes/:type/cancel': 'Cancel notes',
      'GET /api/notes/types': 'Get supported note types',
      'GET /api/notes/:type/example': 'Get example payload for note type',
      'GET /api/notes/test': 'Connectivity test',
      'GET /api/notes/cache/stats': 'Cache statistics',
      'DELETE /api/notes/cache/clear': 'Clear cache',
      'GET /api/notes/numbering/stats': 'Numbering statistics',
      'POST /api/notes/numbering/release': 'Release numbering',
      'POST /api/notes/database/initialize': 'Initialize database tables'
    },
    supportedTypes: {
      available: ['nfce'],
      comingSoon: ['nfe', 'nfse']
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

  // Swagger/OpenAPI
  const fastifySwagger = await import('@fastify/swagger');
  const fastifySwaggerUI = await import('@fastify/swagger-ui');
  await app.register(fastifySwagger.default, {
    openapi: {
      info: {
        title: 'API Unificada para Notas Fiscais',
        description: 'API para emissão, consulta, cancelamento e utilitários de NFC-e, NFe, NFSe',
        version: '2.0.0'
      }
    }
  });
  await app.register(fastifySwaggerUI.default, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Registrar rotas unificadas
  await app.register(routes, { prefix: '/api' });
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
  if (process.env.NODE_ENV !== 'production') {
    console.error('Erro não tratado:', error);
  }
  
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
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});

// Iniciar aplicação
if (require.main === module) {
  start();
}

export default app;
