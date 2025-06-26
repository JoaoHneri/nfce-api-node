import { FastifyInstance } from 'fastify';
import { NFCeController } from '../controllers/nfceController';

async function nfcRoutes(fastify: FastifyInstance) {
  const nfcController = new NFCeController();

  // Rotas da API
  fastify.post('/emitir', {
    handler: nfcController.emitirNFCe.bind(nfcController)
  });

  fastify.get('/teste', {
    handler: nfcController.testeConectividade.bind(nfcController)
  });

  fastify.get('/exemplo', {
    handler: nfcController.obterExemplo.bind(nfcController)
  });

  fastify.post('/consultar/:chave', {
    handler: nfcController.consultarNFCe.bind(nfcController)
  });

  fastify.post('/cancelar-nfce', {
    handler: nfcController.cancelarNFCe.bind(nfcController)
  });

  fastify.get('/cache/stats', {
    handler: nfcController.obterEstatisticasCache.bind(nfcController)
  });

  fastify.post('/cache/limpar', {
    handler: nfcController.limparCacheManual.bind(nfcController)
  });

  // 🎯 NOVAS ROTAS: Consultar tributação automática
  fastify.get('/tributacao/:crt/:cst', {
    handler: nfcController.consultarTributacao.bind(nfcController)
  });

  fastify.get('/regimes', {
    handler: nfcController.listarRegimes.bind(nfcController)
  });
}

export default nfcRoutes;
