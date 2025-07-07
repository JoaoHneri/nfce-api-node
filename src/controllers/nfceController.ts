import { FastifyRequest, FastifyReply } from 'fastify';
import { SefazNfceService } from '../services/sefazNfceService';
import { NumeracaoService } from '../services/numeracaoService';
import { getDatabaseConfig, createDatabaseConnection } from '../config/database';
import { CertificadoConfig } from '../types';
import { validarCertificado } from '../utils/validadorCertificado';
import { MemberService } from '../services/memberService';
import { EmissaoNfceHandler } from '../handlers/emissaoNfceHandler';
import { CancelamentoHandler } from '../handlers/cancelamentoHandler';
import { ConsultaHandler } from '../handlers/consultaNfceHandlers';

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



  async emitirNFCe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { memberCnpj, environment, nfceData } = request.body as { 
        memberCnpj: string, 
        environment: number, 
        nfceData: any 
      };

      if (!memberCnpj || !environment || !nfceData) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters',
          error: 'memberCnpj, environment, and nfceData are required'
        });
        return;
      }

      // Note: Number validation is handled in the emission handler

      const resultado = await this.emissaoHandler.processarEmissaoCompleta(
        memberCnpj, 
        environment, 
        nfceData, 
        this.sefazNfceService
      );

      if (resultado.success) {
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
      // Exemplo simplificado - dados da empresa e certificado vêm do banco
      const exemploSimplificado = {
          memberCnpj: "12345678000199",    // CNPJ da empresa cadastrada no banco
          environment: 2,                  // 2 = Homologation, 1 = Production
          
          nfceData: {
              ide: {
                  natOp: "VENDA",
                  serie: "1"
              },
              recipient: {
                  cpf: "12345678901",
                  xName: "CONSUMIDOR FINAL",
                  ieInd: "9" // 9-Não contribuinte
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
                  xContact: "João Silva - Desenvolvedor",
                  email: "joao.silva@empresa.com.br",
                  phone: "11999887766"
                  // idCSRT e hashCSRT são calculados automaticamente
              },
              payment: {
                  detPag: [
                      {
                          indPag: "0", // 0-Pagamento à vista
                          tPag: "01", // 01-Dinheiro
                          vPag: "10.00"
                      }
                  ],
                  change: "0.00"
              },
              transport: {
                  mode: "9" // 9-Sem ocorrência de transporte
              }
          }
      };

      reply.status(200).send({
          success: true,
          message: 'Simplified example for NFCe issuance with database integration',
          notes: [
              "🚀 NEW: Company and certificate data come from database",
              "📋 Only send memberCnpj and environment",
              "🔍 Backend automatically retrieves company data",
              "🔐 Certificate is selected by CNPJ + environment",
              "💾 NFCe is automatically saved to database after issuance",
              "⚡ Taxes are calculated automatically by backend",
              "📊 Much smaller JSON payload (70% reduction)",
              "🔒 More secure - no certificate data in request"
          ],
          howToUse: {
              endpoint: "POST /api/nfce/create-nfc",
              contentType: "application/json",
              body: "Use the 'simplifiedExample' object below"
          },
          requirements: {
              database: [
                  "Company must be registered in 'member' table",
                  "Certificate must be registered in 'certificates' table",
                  "Certificate must match memberCnpj and environment"
              ],
              fields: {
                  memberCnpj: "CNPJ of registered company",
                  environment: "1=Production, 2=Homologation",
                  nfceData: "Only specific NFCe data (products, recipient, payment, etc.)"
              }
          },
          simplifiedExample: exemploSimplificado,
          
          // Exemplo legado (será removido em versões futuras)
          legacy: {
              note: "Legacy format still supported but deprecated",
              willBeRemoved: "v2.0.0"
          }
      });
  }

  async consultarNFCePorCNPJ(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { accessKey, memberCnpj, environment } = request.params as { 
        accessKey: string;
        memberCnpj: string;
        environment: string;
      };

      if (!accessKey || !memberCnpj || !environment) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters',
          error: 'accessKey, memberCnpj, and environment are required'
        });
        return;
      }

      const environmentNumber = parseInt(environment);
      if (environmentNumber !== 1 && environmentNumber !== 2) {
        reply.status(400).send({
          success: false,
          message: 'Invalid environment',
          error: 'environment must be 1 (Production) or 2 (Homologation)'
        });
        return;
      }

      // ✅ Delegar TODA a lógica para o handler
      const resultado = await this.consultaHandler.consultarNFCePorCNPJ(
        accessKey,
        memberCnpj,
        environmentNumber,
        this.sefazNfceService
      );

      // ✅ Apenas retornar resposta HTTP
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

      reply.status(200).send({ 
        result: resultado,
        warning: 'This endpoint is deprecated. Use GET /api/nfce/consultar/{accessKey}/{memberCnpj}/{environment} instead.'
      });

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
      const { memberCnpj, environment, accessKey, protocol, justification } = request.body as {
        memberCnpj: string;
        environment: number;
        accessKey: string;
        protocol: string;
        justification: string;
      };

      // ✅ Validação de entrada
      if (!memberCnpj || !environment || !accessKey || !protocol || !justification) {
        reply.status(400).send({
          success: false,
          message: 'Missing required parameters',
          error: 'memberCnpj, environment, accessKey, protocol and justification are required'
        });
        return;
      }

      // ✅ Delegar TODA a lógica para o handler
      const resultado = await this.cancelamentoHandler.processarCancelamentoPorCNPJ(
        memberCnpj,
        environment,
        accessKey,
        protocol,
        justification,
        this.sefazNfceService
      );

      // ✅ Apenas retornar resposta HTTP
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
          csc VARCHAR(100),                            -- CSC code
          csc_id VARCHAR(10),                          -- CSC ID
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

      // Executar as queries
      await connection.execute(createMemberTable);
      await connection.execute(createCertificatesTable);
      await connection.execute(createInvoicesTable);

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

