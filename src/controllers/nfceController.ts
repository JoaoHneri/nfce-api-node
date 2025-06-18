import { Request, Response } from 'express';
import { SefazNfceService } from '../Services/sefazNfceService';
import { NFCeData, CertificadoConfig, CancelamentoRequest } from '../types';
import fs from 'fs';
import path from 'path';

export class NFCeController {
  private sefazNfceService: SefazNfceService;

  constructor() {
    // Carregar configuração do certificado
    this.sefazNfceService = new SefazNfceService();
  }


  async emitirNFCe(req: Request, res: Response): Promise<void> {
    try {

      const { dadosNFCe, certificado } = req.body;


      console.log('📝 Iniciando emissão de NFCe...');

      // ✅ TUDO É FEITO NO HANDLER
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

  // Teste de conectividade
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

  // Exemplo de dados para emissão de NFCe
  async obterExemplo(req: Request, res: Response): Promise<void> {
      const exemplo: NFCeData = {
          emitente: {
              CNPJ: "12345678000199", //CNPJ fictício válido
              xNome: "EMPRESA EXEMPLO LTDA",
              xFant: "LOJA EXEMPLO",
              IE: "123456789", //IE fictícia
              CRT: "1", // 1-Simples Nacional
              endereco: {
                  xLgr: "RUA EXEMPLO",
                  nro: "123",
                  xBairro: "CENTRO",
                  cMun: "3550308", // São Paulo
                  xMun: "SÃO PAULO",
                  UF: "SP",
                  CEP: "01234567", //CEP fictício
                  cPais: "1058",
                  xPais: "BRASIL",
                  fone: "1199999999" //Telefone fictício
              }
          },
          destinatario: {
              CPF: "12345678901", //CPF fictício
              xNome: "CONSUMIDOR FINAL",
              indIEDest: "9" // 9-Não contribuinte
          },
          ide: {
              cUF: "35", // São Paulo
              cNF: "00001234", //Código numérico sequencial
              natOp: "VENDA",
              serie: "1", //Série recomendada (não zero)
              nNF: "1", //Número sequencial
              tpNF: "1", // 1-Saída
              idDest: "1", // 1-Operação interna
              cMunFG: "3550308", // São Paulo
              tpImp: "4", // 4-NFCe em papel
              tpEmis: "1", // 1-Emissão normal
              tpAmb: "2", // 2-Homologação
              finNFe: "1", // 1-Normal
              indFinal: "1", // 1-Consumidor final
              indPres: "1", // 1-Operação presencial
              indIntermed: "0", // 0-Sem intermediador
              procEmi: "0", // 0-Emissão com aplicativo do contribuinte
              verProc: "1.0" // Versão do sistema
          },
          produtos: [
              {
                  cProd: "001",
                  cEAN: "SEM GTIN",
                  xProd: "PRODUTO EXEMPLO - AMBIENTE DE HOMOLOGACAO",
                  NCM: "85044010", // NCM para produtos eletrônicos
                  CFOP: "5102", // Venda de mercadoria adquirida ou recebida de terceiros
                  uCom: "UNID",
                  qCom: "1.00",
                  vUnCom: "10.00", //Valor baixo para teste
                  vProd: "10.00",
                  cEANTrib: "SEM GTIN",
                  uTrib: "UNID",
                  qTrib: "1.00",
                  vUnTrib: "10.00",
                  indTot: "1" // 1-Valor compõe total da NF
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
                      vPag: "10.00" //Mesmo valor do produto
                  }
              ],
              vTroco: "0.00"
          },
          transporte: {
              modFrete: "9" // 9-Sem ocorrência de transporte
          }
      };

      res.status(200).json({
          sucesso: true,
          mensagem: 'Exemplo de dados para emissão de NFCe (dados fictícios para teste)',
          observacoes: [
              "Este exemplo contém dados fictícios para ambiente de homologação",
              "Para produção, substitua pelos dados reais da empresa",
              "O valor está baixo (R$ 10,00) para facilitar testes",
              "CNPJ e CPF são fictícios mas com formato válido"
          ],
          exemplo
      });
  }


  async consultarNFCe(req: Request, res: Response): Promise<void> {
    try {

      const { chave } = req.params;
      const { certificado } = req.body;

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


  

  
}