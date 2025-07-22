import { FastifyRequest, FastifyReply } from 'fastify';
import { SefazNfceService } from '../services/sefazNfceService';
import { NumeracaoService } from '../services/numeracaoService';
import { getDatabaseConfig, createDatabaseConnection } from '../config/database';
import { CertificadoConfig } from '../types';
import { validarCertificado } from '../utils/validadorCertificadoUtil';
import { MemberService } from '../services/memberService';
import { EmissaoNfceHandler } from '../handlers/nfceHandlers/emissaoNfceHandler';
import { CancelamentoHandler } from '../handlers/nfceHandlers/cancelamentoHandler';
import { ConsultaHandler } from '../handlers/nfceHandlers/consultaNfceHandlers';

export class NFCeController {
  private sefazNfceService: SefazNfceService;
  private numeracaoService: NumeracaoService;
  private memberService: MemberService; 
  private emissaoHandler: EmissaoNfceHandler;
  private cancelamentoHandler: CancelamentoHandler;
  private consultaHandler: ConsultaHandler;

  constructor() {
    // Carregar configuração do certificado
    this.sefazNfceService = new SefazNfceService();
    
    // Inicializar service de numeração
    const dbConfig = getDatabaseConfig();
    this.numeracaoService = new NumeracaoService(dbConfig);
    this.memberService = new MemberService();
    this.emissaoHandler = new EmissaoNfceHandler();
    this.cancelamentoHandler = new CancelamentoHandler();
    this.consultaHandler = new ConsultaHandler();
  }


  async emitirNota(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { type = 'nfce' } = request.params as { type?: string };
      const { company, noteData, certificate } = request.body as {
        company: string;
        noteData: any;
        certificate: CertificadoConfig;
      };

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
              noteData, // noteData já vem como nfceData
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
          } catch (error: any) {
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

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async consultarNota(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { type = 'nfce', accessKey } = request.params as {
        type?: string;
        accessKey: string;
      };

      const { certificate } = request.body as { certificate: CertificadoConfig };

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
            
            if (!accessKey ) {
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
          } catch (error: any) {
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

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async cancelarNota(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { type = 'nfce' } = request.params as { type?: string };
      const { memberCnpj, environment, accessKey, protocol, justification, certificate } = request.body as {
        memberCnpj: string;
        environment: number;
        accessKey: string;
        protocol: string;
        justification: string;
        certificate: CertificadoConfig;
      };

      // ✅ Validar tipo suportado
      const tiposSuportados = ['nfce', 'nfe', 'nfse'];
      if (!tiposSuportados.includes(type.toLowerCase())) {
        reply.status(400).send({
          success: false,
          message: 'Invalid note type',
          error: `Supported types: ${tiposSuportados.join(', ')}. Received: ${type}`
        });
        return;
      }

      // ✅ Rotear baseado no tipo
      switch (type.toLowerCase()) {
        case 'nfce':
          try {
            // 🎯 Lógica direta para cancelamento NFCe
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
          } catch (error: any) {
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

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async obterExemploUnificado(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { type = 'nfce' } = request.params as { type?: string };

      switch (type.toLowerCase()) {
        case 'nfce':
          // 🎯 Usar exemplo NFCe existente mas adaptar para formato unificado
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
                    CSOSN: 400,        // Isento de ICMS (Simples Nacional)
                    cstPis: 49,        // Isento de PIS
                    pisPercent: 0.00,
                    cstCofins: 49,     // Isento de COFINS
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
              environment: 2, // 1=Produção, 2=Homologação
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

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error getting unified example',
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

  async obterEstatisticasNumeracao(request: FastifyRequest<{
    Querystring: { cnpj: string; uf: string; serie: string; ambiente: '1' | '2' }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { cnpj, uf, serie, ambiente } = request.query;
      
      if (!cnpj || !uf || !serie || !ambiente) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters: cnpj, uf, serie, ambiente'
        });
        return;
      }

      const stats = await this.numeracaoService.obterEstatisticasNumeracao({
        cnpj,
        uf,
        serie,
        ambiente
      });
      
      reply.status(200).send({
        success: true,
        message: 'Numbering statistics retrieved successfully',
        data: {
          nextNNF: stats.proximoNumero,
          totalAuthorized: stats.totalAutorizadas,
          totalRejected: stats.totalRejeitadas,
          lastIssuance: stats.ultimaEmissao,
          lastNumbers: stats.ultimosNumeros,
          company: cnpj,
          state: uf,
          series: serie,
          environment: ambiente === '1' ? 'Production' : 'Staging'
        }
      });
      
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error getting numbering statistics',
        error: error.message
      });
    }
  }

  async liberarNumeracao(request: FastifyRequest<{
    Body: { cnpj: string; uf: string; serie: string; ambiente: '1' | '2'; nNF: string; motivo: string }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { cnpj, uf, serie, ambiente, nNF, motivo } = request.body;
      
      if (!cnpj || !uf || !serie || !ambiente || !nNF || !motivo) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters: cnpj, uf, serie, ambiente, nNF, motivo'
        });
        return;
      }

      await this.numeracaoService.liberarNumeracaoReservada({
        cnpj,
        uf,
        serie,
        ambiente
      }, nNF, motivo);
      
      reply.status(200).send({
        success: true,
        message: 'Numbering released successfully',
        data: {
          nNF,
          motivo,
          company: cnpj,
          state: uf,
          series: serie,
          environment: ambiente === '1' ? 'Production' : 'Staging'
        }
      });
      
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error releasing numbering',
        error: error.message
      });
    }
  }

  async criarTabelas(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const dbConfig = getDatabaseConfig();
      const connection = await createDatabaseConnection(dbConfig);

      // SQL para criar tabela de membros - COMPLETA com todos os campos do JSON
      const createMemberTable = `
        CREATE TABLE IF NOT EXISTS member (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cnpj VARCHAR(14) NOT NULL UNIQUE,
          company_name VARCHAR(255) NOT NULL,          -- xName
          trade_name VARCHAR(255),                     -- xFant
          state_registration VARCHAR(20) NOT NULL,     -- ie
          tax_regime VARCHAR(1) NOT NULL,              -- crt
          
          -- Endereço completo
          street VARCHAR(255) NOT NULL,                -- street
          number VARCHAR(20) NOT NULL,                 -- number
          complement VARCHAR(100),                     -- complement
          neighborhood VARCHAR(100) NOT NULL,          -- neighborhood
          city_code VARCHAR(7) NOT NULL,               -- cityCode
          city VARCHAR(100) NOT NULL,                  -- city
          state VARCHAR(2) NOT NULL,                   -- state
          zipcode VARCHAR(8) NOT NULL,                 -- zipCode
          country_code VARCHAR(4) DEFAULT '1058',      -- cPais
          country VARCHAR(50) DEFAULT 'BRASIL',        -- xPais
          
          -- Contato
          phone VARCHAR(20),                           -- phone
          email VARCHAR(255),
          
          -- Controle
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          -- Índices
          INDEX idx_cnpj (cnpj),
          INDEX idx_state (state),
          INDEX idx_active (is_active),
          INDEX idx_tax_regime (tax_regime)
        )
      `;

      // SQL para criar tabela de certificados - COMPLETA
      const createCertificatesTable = `
        CREATE TABLE IF NOT EXISTS certificates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          pfx_path VARCHAR(500) NOT NULL,
          password VARCHAR(255) NOT NULL,
          consumer_key VARCHAR(100),                    -- era csc
          consumer_key_id VARCHAR(10),                   -- era csc_id
          environment VARCHAR(1) NOT NULL,             -- 1=Production, 2=Homologation
          uf VARCHAR(2) NOT NULL,                      -- UF do certificado
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
          INDEX idx_member_environment (member_id, environment),
          INDEX idx_active (is_active)
        )
      `;

      // SQL para criar tabela de NFCe - COMPLETA com todos os campos
      const createInvoicesTable = `
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          
          -- Dados da NFCe
          access_key VARCHAR(44) NOT NULL UNIQUE,      -- Chave de acesso completa (44 caracteres)
          number INT NOT NULL,                         -- nNF - número da nota
          cnf VARCHAR(8) NOT NULL,                     -- cNF - código numérico da NF
          series VARCHAR(3) NOT NULL DEFAULT '001',    -- série da nota
          issue_date DATETIME NOT NULL,                -- dhEmi - data/hora de emissão
          
          -- Status da NFCe
          status VARCHAR(20) DEFAULT 'pending',        -- pending, authorized, rejected, canceled
          protocol VARCHAR(20),                        -- nProt - protocolo da SEFAZ
          authorization_date DATETIME,                 -- dhRecbto - data autorização
          
          -- Valores totais da NFCe
          total_value DECIMAL(15,2) NOT NULL,          -- vNF - valor total da nota
          discount_value DECIMAL(15,2) DEFAULT 0.00,   -- vDesc - valor desconto
          products_value DECIMAL(15,2) NOT NULL,       -- vProd - valor produtos
          
          -- Impostos
          icms_value DECIMAL(15,2) DEFAULT 0.00,       -- vICMS
          pis_value DECIMAL(15,2) DEFAULT 0.00,        -- vPIS
          cofins_value DECIMAL(15,2) DEFAULT 0.00,     -- vCOFINS
          
          -- XML e dados técnicos
          xml_content LONGTEXT,                        -- XML completo da NFCe
          qr_code TEXT,                                -- QR Code da NFCe
          rejection_reason TEXT,                       -- xMotivo em caso de rejeição
          
          -- Dados adicionais da NFCe
          environment VARCHAR(1),                      -- 1=Production, 2=Homologation
          operation_nature VARCHAR(100),               -- natOp
          recipient_cpf VARCHAR(11),                   -- CPF do destinatário
          recipient_name VARCHAR(255),                 -- Nome do destinatário
          
          -- Controle
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
          INDEX idx_access_key (access_key),
          INDEX idx_member_date (member_id, issue_date),
          INDEX idx_status (status),
          INDEX idx_environment (environment),
          INDEX idx_number_series (number, series),
          INDEX idx_cnf (cnf),                         -- ✅ Índice para cNF
          INDEX idx_member_number_series_env (member_id, number, series, environment), -- ✅ Índice composto para unicidade
          UNIQUE KEY uk_member_number_series_env (member_id, number, series, environment), -- ✅ Garantir unicidade do nNF por empresa/série/ambiente
          UNIQUE KEY uk_member_cnf_series_env (member_id, cnf, series, environment) -- ✅ Garantir unicidade do cNF por empresa/série/ambiente
        )
      `;

      const createNcmTaxRulesTable = `
        CREATE TABLE IF NOT EXISTS ncm_tax_rules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ncm VARCHAR(8) NOT NULL,
          crt VARCHAR(1) NOT NULL COMMENT 'Regime tributário da empresa (ex: 1=Simples, 3=Normal)',
          orig VARCHAR(1) NOT NULL DEFAULT '0' COMMENT 'Origem da mercadoria conforme legislação',
          csosn VARCHAR(3) DEFAULT NULL COMMENT 'CSOSN para Simples Nacional',
          cst_icms VARCHAR(3) DEFAULT NULL COMMENT 'CST ICMS para regime normal',
          modalidade_bc VARCHAR(2) DEFAULT NULL,   -- padronize para modalidade_bc
          icms_percent DECIMAL(5,2) DEFAULT NULL,
          cst_pis VARCHAR(2) DEFAULT NULL COMMENT 'CST PIS',
          pis_percent DECIMAL(5,2) DEFAULT NULL COMMENT 'Alíquota PIS (%)',
          cst_cofins VARCHAR(2) DEFAULT NULL COMMENT 'CST COFINS',
          cofins_percent DECIMAL(5,2) DEFAULT NULL COMMENT 'Alíquota COFINS (%)',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_ncm_crt (ncm, crt)
        )
      `;


      // Executar as queries
      await connection.execute(createMemberTable);
      await connection.execute(createCertificatesTable);
      await connection.execute(createInvoicesTable);
      await connection.execute(createNcmTaxRulesTable);

      await connection.end();
      
      reply.status(200).send({
        success: true,
        message: 'Database tables created successfully',
        data: {
          tables: ['member', 'certificates', 'invoices'],
          timestamp: new Date().toISOString(),
          details: {
            member: 'Complete company data with address and tax info',
            certificates: 'Digital certificates with CSC and environment',
            invoices: 'NFCe invoices with complete tracking including cNF (código numérico)'
          }
        }
      });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error creating database tables',
        error: error.message
      });
    }
  }

}