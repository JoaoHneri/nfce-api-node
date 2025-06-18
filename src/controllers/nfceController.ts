import { Request, Response } from 'express';
import { SefazNfceService } from '../Services/sefazNfceService';
import { NFCeData, CertificadoConfig, CancelamentoRequest } from '../types';
import { validarCertificado } from '../utils/validadorCertificado';
export class NFCeController {
  private sefazNfceService: SefazNfceService;

  constructor() {
    // Carregar configuração do certificado
    this.sefazNfceService = new SefazNfceService();
  }



  async emitirNFCe(req: Request, res: Response): Promise<void> {
    try {

      const { dadosNFCe, certificado } = req.body;

       if (!validarCertificado(certificado, res)) {
        return;
      }

      console.log('📝 Iniciando emissão de NFCe...');

      const resultado = await this.sefazNfceService.emitirNFCe(dadosNFCe, certificado);

      if (resultado.sucesso) {
        console.log('🎉 NFCe autorizada com sucesso!');

        res.status(200).json({
          sucesso: true,
          mensagem: 'NFCe emitida com sucesso',
          dados: {
            chaveAcesso: resultado.chaveAcesso,
            protocolo: resultado.protocolo,
            dataHora: resultado.dataHora,
            status: resultado.cStat,
            motivo: resultado.xMotivo
          }
        });
      } else {
        console.log('❌ Erro na emissão:', resultado.xMotivo);

        res.status(400).json({
          sucesso: false,
          mensagem: 'Erro na emissão da NFCe',
          erro: resultado.xMotivo || resultado.erro
        });
      }

    } catch (error: any) {
      console.error('❌ Erro interno:', error.message);

      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor',
        erro: error.message
      });
    }
  }


  async testeConectividade(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 Testando conectividade...');

      // Teste básico
      const agora = new Date().toISOString();

      res.status(200).json({
        sucesso: true,
        mensagem: 'API funcionando corretamente',
        dados: {
          timestamp: agora,
          versao: '1.0.0',
          ambiente: process.env.NODE_ENV || 'development'
        }
      });

    } catch (error: any) {
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro no teste de conectividade',
        erro: error.message
      });
    }
  }

  async obterExemplo(req: Request, res: Response): Promise<void> {
      const exemploCompleto = {
          certificado: {
              pfx: "/caminho/para/seu/certificado.pfx",
              senha: "senha_do_certificado",
              CSC: "seu_codigo_CSC_aqui",
              CSCid: "1",
              CNPJ: "12345678000199",
              tpAmb: 2, // 2 = Homologação, 1 = Produção
              UF: "SP"
          },
          
          dadosNFCe: {
              emitente: {
                  CNPJ: "12345678000199", //Mesmo CNPJ do certificado
                  xNome: "EMPRESA EXEMPLO LTDA",
                  xFant: "LOJA EXEMPLO",
                  IE: "123456789",
                  CRT: "1", // 1-Simples Nacional
                  endereco: {
                      xLgr: "RUA EXEMPLO",
                      nro: "123",
                      xBairro: "CENTRO",
                      cMun: "3550308", // São Paulo
                      xMun: "SÃO PAULO",
                      UF: "SP", //Mesmo UF do certificado
                      CEP: "01234567",
                      cPais: "1058",
                      xPais: "BRASIL",
                      fone: "1199999999"
                  }
              },
              destinatario: {
                  CPF: "12345678901",
                  xNome: "CONSUMIDOR FINAL",
                  indIEDest: "9" // 9-Não contribuinte
              },
              ide: {
                  cUF: "35", // São Paulo -Consistente com UF
                  cNF: "00001234",
                  natOp: "VENDA",
                  serie: "1",
                  nNF: "1",
                  tpNF: "1", // 1-Saída
                  idDest: "1", // 1-Operação interna
                  cMunFG: "3550308", // São Paulo
                  tpImp: "4", // 4-NFCe em papel
                  tpEmis: "1", // 1-Emissão normal
                  tpAmb: "2", //Mesmo ambiente do certificado
                  finNFe: "1", // 1-Normal
                  indFinal: "1", // 1-Consumidor final
                  indPres: "1", // 1-Operação presencial
                  indIntermed: "0", // 0-Sem intermediador
                  procEmi: "0", // 0-Emissão com aplicativo do contribuinte
                  verProc: "1.0"
              },
              produtos: [
                  {
                      cProd: "001",
                      cEAN: "SEM GTIN",
                      xProd: "PRODUTO EXEMPLO - AMBIENTE DE HOMOLOGACAO",
                      NCM: "85044010",
                      CFOP: "5102",
                      uCom: "UNID",
                      qCom: "1.00",
                      vUnCom: "10.00",
                      vProd: "10.00",
                      cEANTrib: "SEM GTIN",
                      uTrib: "UNID",
                      qTrib: "1.00",
                      vUnTrib: "10.00",
                      indTot: "1"
                  }
              ],
              impostos: {
                  orig: "0", // 0-Nacional
                  CSOSN: "102", // 102-Tributada pelo Simples Nacional sem permissão de crédito
                  CST_PIS: "49", // 49-Outras operações de saída
                  CST_COFINS: "49" // 49-Outras operações de saída
              },
              pagamento: {
                  detPag: [
                      {
                          indPag: "0", // 0-Pagamento à vista
                          tPag: "01", // 01-Dinheiro
                          vPag: "10.00"
                      }
                  ],
                  vTroco: "0.00"
              },
              transporte: {
                  modFrete: "9" // 9-Sem ocorrência de transporte
              }
          }
      };

      res.status(200).json({
          sucesso: true,
          mensagem: 'Exemplo completo para emissão de NFCe via HUB',
          observacoes: [
              "🏢 API HUB: Aceita certificado por requisição",
              "🔑 Substitua os dados do certificado pelos reais",
              "📁 Ajuste o caminho do arquivo .pfx",
              "🌍 tpAmb: 2=Homologação, 1=Produção",
              "📍 UF deve ser consistente em certificado e emitente",
              "💰 Valor baixo (R$ 10,00) para facilitar testes",
              "📋 CNPJ fictício mas com formato válido"
          ],
          comoUsar: {
              endpoint: "POST /api/nfce/emitir",
              contentType: "application/json",
              body: "Use o objeto 'exemploCompleto' abaixo"
          },
          exemploCompleto
      });
  }

  async consultarNFCe(req: Request, res: Response): Promise<void> {
    try {

      const { chave } = req.params;
      const { certificado } = req.body;

       if (!validarCertificado(certificado, res)) {
        return; // Resposta já foi enviada pela função
      }

      if (!chave) {
        res.status(400).json({
          erro: 'Chave de acesso é obrigatória',
          status: 400
        });
        return;
      }

      const resultado = await this.sefazNfceService.consultarNFCe(chave, certificado);

      res.status(200).json({ resultado });

    } catch (error: any) {

      res.status(500).json({
        erro: 'Erro interno do servidor',
        mensagem: 'Erro inesperado ao consultar NFCe',
        detalhes: {
          erro: error.message,
          timestamp: new Date().toISOString()
        }
      });

    }
  }

  async cancelarNFCe(req: Request, res: Response): Promise<void> {
    try {
      const { chaveAcesso, protocolo, justificativa, certificado } = req.body;

       if (!validarCertificado(certificado, res)) {
        return; // Resposta já foi enviada pela função
      }

      // Validação básica
      if (!chaveAcesso || !protocolo || !justificativa) {
        res.status(400).json({
          erro: 'Dados obrigatórios',
          mensagem: 'chaveAcesso, protocolo e justificativa são obrigatórios',
          status: 400
        });
        return;
      }

      console.log(`🚫 Cancelando NFCe: ${chaveAcesso}`);

      const dadosCancelamento: CancelamentoRequest = {
        chaveAcesso,
        protocolo,
        justificativa
      };

      // Cancelamento via service
      const resultado = await this.sefazNfceService.cancelarNFCe(dadosCancelamento, certificado);
      console.log(`🚫 Resultado do cancelamento: ${JSON.stringify(resultado)}`);
      res.status(200).json(resultado);

    } catch (error: any) {
      console.error('❌ Erro no cancelamento NFCe:', error);

      res.status(500).json({
        erro: 'Erro interno do servidor',
        mensagem: 'Erro inesperado ao cancelar NFCe',
        detalhes: {
          erro: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async obterEstatisticasCache(req: Request, res: Response): Promise<void> {
      try {
          const stats = this.sefazNfceService.obterEstatisticasCache();
          
          res.status(200).json({
              sucesso: true,
              mensagem: 'Estatísticas do cache de Tools',
              dados: stats
          });
      } catch (error: any) {
          res.status(500).json({
              sucesso: false,
              erro: error.message
          });
      }
  }

  async limparCacheManual(req: Request, res: Response): Promise<void> {
      try {
          this.sefazNfceService.limparCache();
          
          res.status(200).json({
              sucesso: true,
              mensagem: 'Cache limpo com sucesso'
          });
      } catch (error: any) {
          res.status(500).json({
              sucesso: false,
              erro: error.message
          });
      }
  }



  
}