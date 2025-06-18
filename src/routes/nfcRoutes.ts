import { Router } from 'express';
import { NFCeController } from '../controllers/nfceController';

const router = Router();
const nfcController = new NFCeController();

// Rotas da API com binding correto
router.post('/emitir', nfcController.emitirNFCe.bind(nfcController));
router.get('/teste', nfcController.testeConectividade.bind(nfcController));
router.get('/exemplo', nfcController.obterExemplo.bind(nfcController));
router.post('/consultar/:chave', nfcController.consultarNFCe.bind(nfcController));
router.post('/cancelar-nfce', nfcController.cancelarNFCe.bind(nfcController));
router.get('/cache/stats', nfcController.obterEstatisticasCache.bind(nfcController));
router.post('/cache/limpar', nfcController.limparCacheManual.bind(nfcController));

export default router;