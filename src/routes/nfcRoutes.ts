import { FastifyInstance } from 'fastify';
import { NFCeController } from '../controllers/nfceController';

async function nfcRoutes(fastify: FastifyInstance) {
  const nfcController = new NFCeController();

  // API Routes
  fastify.post('/create-nfc', {
    handler: nfcController.emitirNFCe.bind(nfcController)
  });

  fastify.get('/test', {
    handler: nfcController.testeConectividade.bind(nfcController)
  });

  fastify.get('/example', {
    handler: nfcController.obterExemplo.bind(nfcController)
  });

  fastify.post('/consult/:accessKey', {
    handler: nfcController.consultarNFCe.bind(nfcController)
  });

  fastify.post('/cancel-nfc', {
    handler: nfcController.cancelarNFCe.bind(nfcController)
  });

  fastify.get('/cache/stats', {
    handler: nfcController.obterEstatisticasCache.bind(nfcController)
  });

  fastify.delete('/cache/clear', {
    handler: nfcController.limparCacheManual.bind(nfcController)
  });

  // TAX ROUTES: Tax consultation and calculation
  fastify.get('/tax/:crt/:cst', {
    handler: nfcController.consultarTributacao.bind(nfcController)
  });

  fastify.get('/tax/regimes', {
    handler: nfcController.listarRegimes.bind(nfcController)
  });

  // ADVANCED TAX ROUTES
  
  fastify.get('/tax/simulate/:crt/:cstpis/:cstcofins/:valor', {
    handler: nfcController.simularCalculoTributario.bind(nfcController)
  });

  fastify.get('/tax/report', {
    handler: nfcController.obterRelatorioAliquotas.bind(nfcController)
  });

  fastify.get('/tax/validate-cst/:cst', {
    handler: nfcController.validarCST.bind(nfcController)
  });
}

export default nfcRoutes;
