import { Router } from 'express';
import { NFCController } from '../controllers/nfceController';

const router = Router();
const nfcController = new NFCController();

// Rotas da API
router.post('/emitir', (req, res) => nfcController.emitirNFCe(req, res));
router.get('/status-sefaz', (req, res) => nfcController.consultarStatusSefaz(req, res));
router.get('/teste', (req, res) => nfcController.testeConectividade(req, res));
router.get('/exemplo', (req, res) => nfcController.obterExemplo(req, res));

export { router as nfcRoutes };