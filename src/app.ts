import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nfcRoutes from './routes/nfcRoutes';

// Carregar variáveis de ambiente


const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet()); // Segurança
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/nfce', nfcRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API NFCe - SEFAZ',
    versao: '1.0.0',
    endpoints: {
      'POST /api/nfce/emitir': 'Emitir NFCe',
      'GET /api/nfce/status-sefaz': 'Consultar status da SEFAZ',
      'GET /api/nfce/teste': 'Teste de conectividade',
      'GET /api/nfce/exemplo': 'Obter exemplo de dados'
    }
  });
});

// Middleware de erro global
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro não tratado:', error);
  
  res.status(500).json({
    sucesso: false,
    mensagem: 'Erro interno do servidor',
    erro: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Middleware 404
app.use('*', (req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API NFCe rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

export default app;