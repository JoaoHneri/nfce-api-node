import { SefazNfceService } from '../services/sefazNfceService.js';
import { NumeracaoService } from '../services/numeracaoService.js';
import { getDatabaseConfig, createDatabaseConnection } from '../config/database.js';
import { MemberService } from '../services/memberService.js';
import { EmissaoNfceHandler } from '../handlers/nfceHandlers/emissaoNfceHandler.js';
import { CancelamentoHandler } from '../handlers/nfceHandlers/cancelamentoHandler.js';
import { ConsultaHandler } from '../handlers/nfceHandlers/consultaNfceHandlers.js';

export class NFCeController {
  constructor() {
    this.sefazNfceService = new SefazNfceService();
    const dbConfig = getDatabaseConfig();
    this.numeracaoService = new NumeracaoService(dbConfig);
    this.memberService = new MemberService();
    this.emissaoHandler = new EmissaoNfceHandler();
    this.cancelamentoHandler = new CancelamentoHandler();
    this.consultaHandler = new ConsultaHandler();
  }

  async emitirNota(request, reply) {
    try {
      const { type = 'nfce' } = request.params;
      const { company, noteData, certificate } = request.body;

      if (!company || !noteData || !certificate) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters',
          error: 'company, noteData, and certificate are required'
        });
        return;
      }

      const tiposSuportados = ['nfce', 'nfe', 'nfse'];
      if (!tiposSuportados.includes(type.toLowerCase())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid note type',
          error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
        });
        return;
      }

      switch (type.toLowerCase()) {
        case 'nfce':
          try {
            if (!company || !noteData || !certificate) {
              reply.status(400).send({
                success: false,
                message: 'Missing required parameters',
                error: 'company, environment, noteData, and certificate are required'
              });
              return;
            }

            const resultado = await this.sefazNfceService.emitirNFCe(
              company,
              certificate,
              noteData
            );

            const isSuccess = resultado.fiscal?.status?.code === "100";

            if (isSuccess) {
              reply.status(200).send({
                success: true,
                message: 'NFCe issued successfully',
                data: resultado
              });
            } else {
              reply.status(400).send({
                success: false,
                message: 'Error issuing NFCe',
                error: resultado.error,
                data: resultado
              });
            }
          } catch (error) {
            reply.status(500).send({
              success: false,
              message: 'Internal server error',
              error: error.message
            });
          }
          return;

        case 'nfe':
          reply.status(501).send({
            success: false,
            message: 'NFe not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfe',
              status: 'coming_soon',
              estimatedRelease: 'Q2 2025'
            }
          });
          return;

        case 'nfse':
          reply.status(501).send({
            success: false,
            message: 'NFSe not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfse',
              status: 'coming_soon',
              estimatedRelease: 'Q3 2025'
            }
          });
          return;

        default:
          reply.status(400).send({
            success: false,
            message: 'Invalid note type',
            error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
          });
          return;
      }

    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async consultarNota(request, reply) {
    try {
      const { type = 'nfce', accessKey } = request.params;
      const { certificate } = request.body;

      const tiposSuportados = ['nfce', 'nfe', 'nfse'];
      if (!tiposSuportados.includes(type.toLowerCase())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid note type',
          error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
        });
        return;
      }

      switch (type.toLowerCase()) {
        case 'nfce':
          try {
            if (!accessKey) {
              reply.status(400).send({
                success: false,
                message: 'Missing required parameters',
                error: 'accessKey is required'
              });
              return;
            }

            if (!certificate || !certificate.cnpj || !certificate.environment) {
              reply.status(400).send({
                success: false,
                message: 'Missing certificate parameters',
                error: 'certificate.cnpj and certificate.environment are required'
              });
              return;
            }

            const environmentNumber = certificate.environment;
            if (environmentNumber !== 1 && environmentNumber !== 2) {
              reply.status(400).send({
                success: false,
                message: 'Invalid environment',
                error: 'environment must be 1 (Production) or 2 (Homologation)'
              });
              return;
            }

            const resultado = await this.sefazNfceService.consultarNFCe(accessKey, certificate);

            if (resultado.success) {
              reply.status(200).send({
                success: true,
                message: 'NFCe consulted successfully',
                data: resultado.data
              });
            } else {
              reply.status(400).send({
                success: false,
                message: 'Error consulting NFCe',
                error: resultado.error,
                data: resultado.data
              });
            }
          } catch (error) {
            reply.status(500).send({
              success: false,
              message: 'Internal server error',
              error: error.message
            });
          }
          return;

        case 'nfe':
          reply.status(501).send({
            success: false,
            message: 'NFe consultation not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfe',
              status: 'coming_soon'
            }
          });
          return;

        case 'nfse':
          reply.status(501).send({
            success: false,
            message: 'NFSe consultation not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfse',
              status: 'coming_soon'
            }
          });
          return;

        default:
          reply.status(400).send({
            success: false,
            message: 'Invalid note type',
            error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
          });
          return;
      }

    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async cancelarNota(request, reply) {
    try {
      const { type = 'nfce' } = request.params;
      const { memberCnpj, environment, accessKey, protocol, justification, certificate } = request.body;

      const tiposSuportados = ['nfce', 'nfe', 'nfse'];
      if (!tiposSuportados.includes(type.toLowerCase())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid note type',
          error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
        });
        return;
      }

      switch (type.toLowerCase()) {
        case 'nfce':
          try {
            if (!accessKey || !protocol || !justification || !certificate) {
              reply.status(400).send({
                success: false,
                message: 'Missing required parameters',
                error: 'accessKey, protocol, justification and certificate are required'
              });
              return;
            }

            const cancelData = {
              accessKey,
              protocol,
              justification
            }
            const resultado = await this.sefazNfceService.cancelarNFCe(cancelData, certificate);

            if (resultado.success) {
              reply.status(200).send({
                success: true,
                message: 'NFCe cancelled successfully',
                data: resultado.data
              });
            } else {
              reply.status(400).send({
                success: false,
                message: 'Error cancelling NFCe',
                error: resultado.error,
                data: resultado.data
              });
            }
          } catch (error) {
            reply.status(500).send({
              success: false,
              message: 'Internal server error',
              error: error.message
            });
          }
          return;

        case 'nfe':
          reply.status(501).send({
            success: false,
            message: 'NFe cancellation not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfe',
              status: 'coming_soon'
            }
          });
          return;

        case 'nfse':
          reply.status(501).send({
            success: false,
            message: 'NFSe cancellation not implemented yet',
            error: 'This feature will be available in future version',
            data: {
              type: 'nfse',
              status: 'coming_soon'
            }
          });
          return;

        default:
          reply.status(400).send({
            success: false,
            message: 'Invalid note type',
            error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
          });
          return;
      }

    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async obterExemploUnificado(request, reply) {
    try {
      const { type = 'nfce' } = request.params;

      switch (type.toLowerCase()) {
        case 'nfce':
          const exemploNFCe = {
            company: {
              cnpj: "12345678000199",
              xName: "EMPRESA FICTICIA LTDA",
              xFant: "EMPRESA FICTICIA",
              ie: "123456789000",
              crt: "1",
              address: {
                street: "RUA FICTICIA",
                number: "100",
                district: "CENTRO",
                city: "CIDADE FICTICIA",
                state: "SP",
                zipCode: "00000000",
                phone: "11999999999"
              }
            },
            noteData: {
              ide: {
                cUF: "35",
                cNF: "1",
                natOp: "VENDA",
                serie: "884",
                nNF: "1",
                tpNF: "1",
                idDest: "1",
                cMunFG: "3550308",
                tpImp: "4",
                tpEmis: "1",
                tpAmb: "2",
                finNFe: "1",
                indFinal: "1",
                indPres: "1",
                indIntermed: "0",
                procEmi: "0",
                verProc: "1.0"
              },
              recipient: {
                cpf: "11750943077",
                xName: "CONSUMIDOR FINAL",
                ieInd: "9",
                email: "consumidor@exemplo.com"
              },
              products: [
                {
                  cProd: "001",
                  cEAN: "SEM GTIN",
                  xProd: "PRODUTO EXEMPLO",
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
                  indTot: "1",
                  taxes: {
                    orig: 0,
                    CSOSN: 400,
                    cstPis: 49,
                    pisPercent: 0.00,
                    cstCofins: 49,
                    cofinsPercent: 0.00
                  }
                }
              ],
              payment: {
                detPag: [
                  {
                    indPag: "0",
                    tPag: "01",
                    vPag: "10.00"
                  }
                ],
                change: "0.00"
              }
            },
            certificate: {
              pfxPath: "/certificates/12345678000199.pfx",
              password: "senha123",
              consumer_key: "csc",
              consumer_key_id: "1",
              uf: "SP",
              environment: 2,
              cnpj: "12345678000199"
            }
          };

          reply.status(200).send({
            success: true,
            message: 'Unified example for NFCe issuance',
            type: 'nfce',
            status: 'available',
            endpoint: 'POST /api/notes/nfce/issue',
            example: exemploNFCe,
            compatibility: {
              unifiedFormat: exemploNFCe,
              specificFormat: {
                endpoint: 'POST /api/nfce/create-nfc',
                body: {
                  memberCnpj: exemploNFCe.company.cnpj,
                  environment: exemploNFCe.certificate.environment,
                  nfceData: exemploNFCe.noteData
                }
              }
            }
          });
          break;

        case 'nfe':
          reply.status(501).send({
            success: false,
            message: 'NFe example not available yet',
            type: 'nfe',
            status: 'coming_soon',
            estimatedRelease: 'Q2 2025'
          });
          break;

        case 'nfse':
          reply.status(501).send({
            success: false,
            message: 'NFSe example not available yet',
            type: 'nfse',
            status: 'coming_soon',
            estimatedRelease: 'Q3 2025'
          });
          break;

        default:
          reply.status(400).send({
            success: false,
            message: 'Invalid note type',
            error: 'Supported types: nfce, nfe, nfse'
          });
      }

    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Error getting unified example',
        error: error.message
      });
    }
  }

  async testeConectividade(request, reply) {
    try {
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

    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Error in connectivity test',
        error: error.message
      });
    }
  }

  async obterEstatisticasCache(request, reply) {
    try {
      const stats = this.sefazNfceService.obterEstatisticasCache();

      reply.status(200).send({
        success: true,
        message: 'Tools cache statistics',
        data: stats
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Error getting cache statistics',
        error: error.message
      });
    }
  }

  async limparCacheManual(request, reply) {
    try {
      this.sefazNfceService.limparCache();

      reply.status(200).send({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        message: 'Error clearing cache',
        error: error.message
      });
    }
  }

}
