import { Router } from 'express';
import { NFCeController } from '../controllers/nfceController';

const router = Router();
const nfcController = new NFCeController();

// Rotas da API com binding correto
router.post('/emitir', nfcController.emitirNFCe.bind(nfcController));
router.get('/status-sefaz', nfcController.consultarStatusSefaz.bind(nfcController));
router.get('/teste', nfcController.testeConectividade.bind(nfcController));
router.get('/exemplo', nfcController.obterExemplo.bind(nfcController));

export default router;