import { FastifyRequest, FastifyReply } from 'fastify';
import { SefazNfceService } from '../Services/sefazNfceService';
import { NFCeData, CertificadoConfig, CancelamentoRequest } from '../types';
import { validarCertificado } from '../utils/validadorCertificado';

export class NFCeController {
  private sefazNfceService: SefazNfceService;

  constructor() {
    // Carregar configuração do certificado
    this.sefazNfceService = new SefazNfceService();
  }

  async emitirNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { dadosNFCe, certificado } = request.body as { dadosNFCe: any, certificado: CertificadoConfig };

      if (!validarCertificado(certificado, reply)) {
        return;
      }

      const resultado = await this.sefazNfceService.emitirNFCe(dadosNFCe, certificado);

      if (resultado.sucesso) {
        reply.status(200).send({
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
        reply.status(400).send({
          sucesso: false,
          mensagem: 'Erro na emissão da NFCe',
          erro: resultado.xMotivo || resultado.erro
        });
      }

    } catch (error: any) {
      console.error('Erro interno:', error.message);

      reply.status(500).send({
        sucesso: false,
        mensagem: 'Erro interno do servidor',
        erro: error.message
      });
    }
  }

  async testeConectividade(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Teste básico
      const agora = new Date().toISOString();

      reply.status(200).send({
        sucesso: true,
        mensagem: 'API funcionando corretamente',
        dados: {
          timestamp: agora,
          versao: '1.0.0',
          ambiente: process.env.NODE_ENV || 'development'
        }
      });

    } catch (error: any) {
      reply.status(500).send({
        sucesso: false,
        mensagem: 'Erro no teste de conectividade',
        erro: error.message
      });
    }
  }

  async obterExemplo(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      reply.status(200).send({
          sucesso: true,
          mensagem: 'Exemplo completo para emissão de NFCe via HUB',
          observacoes: [
              "API HUB: Aceita certificado por requisição",
              "Substitua os dados do certificado pelos reais",
              "Ajuste o caminho do arquivo .pfx",
              "tpAmb: 2=Homologação, 1=Produção",
              "UF deve ser consistente em certificado e emitente",
              "Valor baixo (R$ 10,00) para facilitar testes",
              "CNPJ fictício mas com formato válido"
          ],
          comoUsar: {
              endpoint: "POST /api/nfce/emitir",
              contentType: "application/json",
              body: "Use o objeto 'exemploCompleto' abaixo"
          },
          exemploCompleto
      });
  }

  async consultarNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { chave } = request.params as { chave: string };
      const { certificado } = request.body as { certificado: CertificadoConfig };

      if (!validarCertificado(certificado, reply)) {
        return; // Resposta já foi enviada pela função
      }

      if (!chave) {
        reply.status(400).send({
          erro: 'Chave de acesso é obrigatória',
          status: 400
        });
        return;
      }

      const resultado = await this.sefazNfceService.consultarNFCe(chave, certificado);

      reply.status(200).send({ resultado });

    } catch (error: any) {
      reply.status(500).send({
        erro: 'Erro interno do servidor',
        mensagem: 'Erro inesperado ao consultar NFCe',
        detalhes: {
          erro: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async cancelarNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { chaveAcesso, protocolo, justificativa, certificado } = request.body as {
        chaveAcesso: string;
        protocolo: string;
        justificativa: string;
        certificado: CertificadoConfig;
      };

      if (!validarCertificado(certificado, reply)) {
        return; // Resposta já foi enviada pela função
      }

      // Validação básica
      if (!chaveAcesso || !protocolo || !justificativa) {
        reply.status(400).send({
          erro: 'Dados obrigatórios',
          mensagem: 'chaveAcesso, protocolo e justificativa são obrigatórios',
          status: 400
        });
        return;
      }

      const dadosCancelamento: CancelamentoRequest = {
        chaveAcesso,
        protocolo,
        justificativa
      };

      // Cancelamento via service
      const resultado = await this.sefazNfceService.cancelarNFCe(dadosCancelamento, certificado);
      reply.status(200).send(resultado);

    } catch (error: any) {
      console.error('Erro no cancelamento NFCe:', error);

      reply.status(500).send({
        erro: 'Erro interno do servidor',
        mensagem: 'Erro inesperado ao cancelar NFCe',
        detalhes: {
          erro: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async obterEstatisticasCache(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
          const stats = this.sefazNfceService.obterEstatisticasCache();
          
          reply.status(200).send({
              sucesso: true,
              mensagem: 'Estatísticas do cache de Tools',
              dados: stats
          });
      } catch (error: any) {
          reply.status(500).send({
              sucesso: false,
              erro: error.message
          });
      }
  }

  async limparCacheManual(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
          this.sefazNfceService.limparCache();
          
          reply.status(200).send({
              sucesso: true,
              mensagem: 'Cache limpo com sucesso'
          });
      } catch (error: any) {
          reply.status(500).send({
              sucesso: false,
              erro: error.message
          });
      }
  }
}
