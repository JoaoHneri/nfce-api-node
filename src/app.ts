import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nfcRoutes from './routes/nfcRoutes';

// Carregar variáveis de ambiente


const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


app.use('/api/nfce', nfcRoutes);


app.get('/', (req, res) => {
  res.json({
    mensagem: 'API NFCe - SEFAZ',
    versao: '1.0.0',
    endpoints: {
      'POST /api/nfce/emitir': 'Emitir NFCe',
      'GET /api/nfce/teste': 'Teste de conectividade',
      'GET /api/nfce/exemplo': 'Obter exemplo de dados',
      'GET /api/nfce/consultar/:chave': 'Consultar NFCe por chave de acesso',
      'POST /api/nfce/cancelar-nfce': 'Cancelar NFCe'
    }
  });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  
  res.status(500).json({
    sucesso: false,
    mensagem: 'Erro interno do servidor',
    erro: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});


app.use('*', (req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});


app.listen(PORT, () => {
  console.log(`API NFCe rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${PORT}`);
});

export default app;