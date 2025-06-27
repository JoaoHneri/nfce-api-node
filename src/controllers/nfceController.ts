import { FastifyRequest, FastifyReply } from 'fastify';
import { SefazNfceService } from '../Services/sefazNfceService';
import { TributacaoService } from '../Services/tributacaoService';
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
      const { nfceData, certificate } = request.body as { nfceData: any, certificate: CertificadoConfig };

      if (!validarCertificado(certificate, reply)) {
        return;
      }

      const resultado = await this.sefazNfceService.emitirNFCe(nfceData, certificate);

      if (resultado.success) {
        reply.status(200).send({
          success: true,
          message: 'NFCe issued successfully',
          data: {
            accessKey: resultado.accessKey,
            protocol: resultado.protocol,
            dateTime: resultado.dateTime,
            status: resultado.cStat,
            reason: resultado.reason
          }
        });
      } else {
        reply.status(400).send({
          success: false,
          message: 'Error issuing NFCe',
          error: resultado.reason || resultado.error
        });
      }

    } catch (error: any) {
      console.error('Internal error:', error.message);

      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async testeConectividade(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Teste básico
      const agora = new Date().toISOString();

      reply.status(200).send({
        success: true,
        message: 'API working correctly',
        data: {
          timestamp: agora,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error in connectivity test',
        error: error.message
      });
    }
  }

  async obterExemplo(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const exemploCompleto = {
          certificate: {
              pfx: "/path/to/your/certificate.pfx",
              password: "certificate_password",
              CSC: "your_CSC_code_here",
              CSCid: "1",
              CNPJ: "12345678000199",
              tpAmb: 2, // 2 = Homologation, 1 = Production
              UF: "SP"
          },
          
          nfceData: {
              issuer: {
                  CNPJ: "12345678000199", // Mesmo CNPJ do certificado
                  xNome: "EMPRESA EXEMPLO LTDA",
                  xFant: "LOJA EXEMPLO",
                  IE: "123456789",
                  CRT: "1", // 1-Simples Nacional
                  address: {
                      xLgr: "RUA EXEMPLO",
                      nro: "123",
                      xBairro: "CENTRO",
                      cMun: "3550308", // São Paulo
                      xMun: "SÃO PAULO",
                      UF: "SP", // Mesmo UF do certificado
                      CEP: "01234567",
                      cPais: "1058",
                      xPais: "BRASIL",
                      fone: "1199999999"
                  }
              },
              recipient: {
                  CPF: "12345678901",
                  xNome: "CONSUMIDOR FINAL",
                  indIEDest: "9" // 9-Não contribuinte
              },
              ide: {
                  cUF: "35", // São Paulo - Consistente com UF
                  cNF: "00001234",
                  natOp: "VENDA",
                  serie: "1",
                  nNF: "1",
                  tpNF: "1", // 1-Saída
                  idDest: "1", // 1-Operação interna
                  cMunFG: "3550308", // São Paulo
                  tpImp: "4", // 4-NFCe em papel
                  tpEmis: "1", // 1-Emissão normal
                  tpAmb: "2", // Mesmo ambiente do certificado
                  finNFe: "1", // 1-Normal
                  indFinal: "1", // 1-Consumidor final
                  indPres: "1", // 1-Operação presencial
                  indIntermed: "0", // 0-Sem intermediário
                  procEmi: "0", // 0-Emissão com aplicativo do contribuinte
                  verProc: "1.0"
              },
              products: [
                  {
                      cProd: "001",
                      cEAN: "SEM GTIN",
                      xProd: "PRODUTO EXEMPLO - AMBIENTE HOMOLOGAÇÃO",
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
              technicalResponsible: {
                CNPJ: "11222333000181", // CNPJ da empresa desenvolvedora/responsável
                xContato: "João Silva - Desenvolvedor",
                email: "joao.silva@empresa.com.br",
                fone: "11999887766"
                // idCSRT e hashCSRT são calculados automaticamente
            },
              taxes: {
                  orig: "0", // 0-Nacional
                  CSOSN: "102", // 102-Tributada pelo Simples Nacional sem permissão de crédito
                  CST_PIS: "49", // 49-Outras operações (CALCULADO AUTOMATICAMENTE PELO BACKEND)
                  CST_COFINS: "49" // 49-Outras operações (CALCULADO AUTOMATICAMENTE PELO BACKEND)
                  // ⚡ NOVO: PIS/COFINS são calculados automaticamente pelo backend!
                  // ✅ Simples Nacional: Sempre R$ 0,00 (recolhido via DAS)
                  // ✅ Lucro Real: 1,65% PIS + 7,60% COFINS
                  // ✅ Produtos isentos: R$ 0,00 conforme CST
              },
              payment: {
                  detPag: [
                      {
                          indPag: "0", // 0-Pagamento à vista
                          tPag: "01", // 01-Dinheiro
                          vPag: "10.00"
                      }
                  ],
                  vTroco: "0.00"
              },
              transport: {
                  modFrete: "9" // 9-Sem ocorrência de transporte
              }
          }
      };

      reply.status(200).send({
          success: true,
          message: 'Complete example for NFCe issuance via HUB',
          notes: [
              "HUB API: Accepts certificate per request",
              "Replace certificate data with real ones",
              "Adjust the .pfx file path",
              "tpAmb: 2=Homologation, 1=Production",
              "UF must be consistent in certificate and issuer",
              "Low value (R$ 10.00) to facilitate testing",
              "Fictional CNPJ but with valid format"
          ],
          howToUse: {
              endpoint: "POST /api/nfce/create-nfc",
              contentType: "application/json",
              body: "Use the 'completeExample' object below"
          },
          completeExample: exemploCompleto
      });
  }

  async consultarNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { accessKey } = request.params as { accessKey: string };
      const { certificate } = request.body as { certificate: CertificadoConfig };

      if (!validarCertificado(certificate, reply)) {
        return; // Resposta já foi enviada pela função
      }

      if (!accessKey) {
        reply.status(400).send({
          success: false,
          message: 'Access key is required',
          error: 'Access key parameter is missing'
        });
        return;
      }

      const resultado = await this.sefazNfceService.consultarNFCe(accessKey, certificate);

      reply.status(200).send({ result: resultado });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'Unexpected error when consulting NFCe',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async cancelarNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { accessKey, protocol, justification, certificate } = request.body as {
        accessKey: string;
        protocol: string;
        justification: string;
        certificate: CertificadoConfig;
      };

      if (!validarCertificado(certificate, reply)) {
        return; // Resposta já foi enviada pela função
      }

      // Validação básica
      if (!accessKey || !protocol || !justification) {
        reply.status(400).send({
          success: false,
          message: 'Required data',
          error: 'accessKey, protocol and justification are required'
        });
        return;
      }

      const dadosCancelamento: CancelamentoRequest = {
        accessKey: accessKey,
        protocol: protocol,
        justification: justification
      };

      // Cancelamento via service
      const resultado = await this.sefazNfceService.cancelarNFCe(dadosCancelamento, certificate);
      reply.status(200).send(resultado);

    } catch (error: any) {
      console.error('Error canceling NFCe:', error);

      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'Unexpected error when canceling NFCe',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async obterEstatisticasCache(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
          const stats = this.sefazNfceService.obterEstatisticasCache();
          
          reply.status(200).send({
              success: true,
              message: 'Tools cache statistics',
              data: stats
          });
      } catch (error: any) {
          reply.status(500).send({
              success: false,
              message: 'Error getting cache statistics',
              error: error.message
          });
      }
  }

  async limparCacheManual(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
          this.sefazNfceService.limparCache();
          
          reply.status(200).send({
              success: true,
              message: 'Cache cleared successfully'
          });
      } catch (error: any) {
          reply.status(500).send({
              success: false,
              message: 'Error clearing cache',
              error: error.message
          });
      }
  }

  //NOVAS FUNCIONALIDADES: Consultar tributação automática
  
  async consultarTributacao(request: FastifyRequest<{
    Params: { crt: string; cst: string }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { crt, cst } = request.params;
      
      const aliquotas = TributacaoService.obterAliquotas(crt, cst);
      const regime = TributacaoService.consultarRegime(crt);
      
      reply.status(200).send({
        success: true,
        message: 'Tax consultation completed successfully',
        data: {
          input: { crt, cst },
          result: aliquotas,
          regime: regime,
          explanation: {
            crt: crt === "1" ? "Simples Nacional" : "Normal Regime",
            automatic: true,
            note: "Values calculated automatically by backend"
          }
        }
      });
      
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: 'Error consulting taxation',
        error: error.message
      });
    }
  }

  async listarRegimes(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      reply.status(200).send({
        success: true,
        message: 'Tax regimes listed successfully',
        data: {
          regimes: [
            {
              crt: "1",
              name: "Simples Nacional",
              pis: "0.00%",
              cofins: "0.00%",
              note: "Collected via DAS"
            },
            {
              crt: "3", 
              name: "Lucro Real",
              pis: "1.65%",
              cofins: "7.60%",
              note: "For normal companies - calculated automatically"
            }
          ],
          examples: {
            simples_nacional: {
              crt: "1",
              cst_pis: "49",
              cst_cofins: "49",
              result: "PIS and COFINS = R$ 0.00"
            },
            lucro_real: {
              crt: "3",
              cst_pis: "01", 
              cst_cofins: "01",
              result: "PIS = 1.65% and COFINS = 7.60% of value"
            }
          }
        }
      });
      
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error listing regimes',
        error: error.message
      });
    }
  }

  //NOVAS FUNCIONALIDADES AVANÇADAS DE TRIBUTAÇÃO
  
  async simularCalculoTributario(request: FastifyRequest<{
    Params: { crt: string; cstpis: string; cstcofins: string; valor: string }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { crt, cstpis, cstcofins, valor } = request.params;
      const valorNumerico = parseFloat(valor);
      
      const simulacao = TributacaoService.simularCalculoCompleto(crt, cstpis, cstcofins, valorNumerico);
      
      reply.status(200).send({
        success: true,
        message: 'Tax calculation simulation completed successfully',
        data: simulacao
      });
      
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: 'Error simulating tax calculation',
        error: error.message
      });
    }
  }

  async obterRelatorioAliquotas(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const relatorio = TributacaoService.obterRelatorioAliquotas();
      
      reply.status(200).send({
        success: true,
        message: 'Tax rates report generated successfully',
        data: relatorio
      });
      
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error getting tax rates report',
        error: error.message
      });
    }
  }

  async validarCST(request: FastifyRequest<{
    Params: { cst: string }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { cst } = request.params;
      
      const validacao = TributacaoService.validarCST(cst);
      
      reply.status(200).send({
        success: true,
        message: 'CST validation completed successfully',
        data: {
          cst: cst,
          validation: validacao
        }
      });
      
    } catch (error: any) {
      reply.status(400).send({
        success: false,
        message: 'Error validating CST',
        error: error.message
      });
    }
  }
}
