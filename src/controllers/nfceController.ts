import { FastifyRequest, FastifyReply } from 'fastify';
import { SefazNfceService } from '../services/sefazNfceService';
import { TributacaoService } from '../services/tributacaoService';
import { NumeracaoService } from '../services/numeracaoService';
import { getDatabaseConfig, createDatabaseConnection } from '../config/database';
import { NFCeData, CertificadoConfig, CancelamentoRequest } from '../types';
import { validarCertificado } from '../utils/validadorCertificado';
import mysql from 'mysql2/promise';

export class NFCeController {
  private sefazNfceService: SefazNfceService;
  private numeracaoService: NumeracaoService;

  constructor() {
    // Carregar configuração do certificado
    this.sefazNfceService = new SefazNfceService();
    
    // Inicializar service de numeração
    const dbConfig = getDatabaseConfig();
    this.numeracaoService = new NumeracaoService(dbConfig);
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

      const dbConfig = getDatabaseConfig();
      const connection = await createDatabaseConnection(dbConfig);

      try {
        // 1. Buscar dados da empresa
        const [memberRows] = await connection.execute(
          `SELECT 
            m.id,
            m.cnpj,
            m.company_name as xName,
            m.trade_name as xFant,
            m.state_registration as ie,
            m.tax_regime as crt,
            m.street,
            m.number,
            m.complement,
            m.neighborhood,
            m.city_code as cityCode,
            m.city,
            m.state,
            m.zipcode as zipCode,
            m.country_code as cPais,
            m.country as xPais,
            m.phone
          FROM member m 
          WHERE m.cnpj = ? AND m.is_active = TRUE`,
          [memberCnpj]
        );

        if (!Array.isArray(memberRows) || memberRows.length === 0) {
          reply.status(404).send({
            success: false,
            message: 'Company not found',
            error: `No active company found with CNPJ: ${memberCnpj}`
          });
          return;
        }

        const memberData = memberRows[0] as any;

        // 2. Buscar certificado da empresa para o ambiente
        const [certificateRows] = await connection.execute(
          `SELECT 
            c.id,
            c.pfx_path as pfxPath,
            c.password,
            c.csc,
            c.csc_id as cscId,
            c.environment,
            c.uf
          FROM certificates c 
          INNER JOIN member m ON c.member_id = m.id 
          WHERE m.cnpj = ? 
            AND c.environment = ? 
            AND c.is_active = TRUE
          ORDER BY c.created_at DESC
          LIMIT 1`,
          [memberCnpj, environment.toString()]
        );

        if (!Array.isArray(certificateRows) || certificateRows.length === 0) {
          reply.status(404).send({
            success: false,
            message: 'Certificate not found',
            error: `No active certificate found for CNPJ: ${memberCnpj} in environment: ${environment}`
          });
          return;
        }

        const certificateData = certificateRows[0] as any;

        // 3. GERAR NUMERAÇÃO AUTOMÁTICA usando o serviço
        const configNumeracao = {
          cnpj: memberData.cnpj,
          uf: memberData.state,
          serie: nfceData.ide.serie,
          ambiente: environment.toString() as '1' | '2'
        };

        const dadosNumeracao = await this.numeracaoService.gerarProximaNumeracao(configNumeracao);

        // 4. Montar dados completos para NFCe
        const certificateConfig: CertificadoConfig = {
          pfxPath: certificateData.pfxPath,
          password: certificateData.password,
          csc: certificateData.csc,
          cscId: certificateData.cscId,
          cnpj: memberData.cnpj,
          environment: parseInt(certificateData.environment),
          uf: certificateData.uf
        };

        // Função para obter código UF
        const getUFCode = (uf: string): string => {
          const ufCodes: { [key: string]: string } = {
            'AC': '12', 'AL': '17', 'AP': '16', 'AM': '23', 'BA': '29', 'CE': '23', 'DF': '53',
            'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15',
            'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43',
            'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17'
          };
          return ufCodes[uf] || '35';
        };

        const nfceDataCompleta: NFCeData = {
          issuer: {
            cnpj: memberData.cnpj,
            xName: memberData.xName,
            xFant: memberData.xFant,
            ie: memberData.ie,
            crt: memberData.crt,
            address: {
              street: memberData.street,
              number: memberData.number,
              neighborhood: memberData.neighborhood,
              cityCode: memberData.cityCode,
              city: memberData.city,
              state: memberData.state,
              zipCode: memberData.zipCode,
              cPais: memberData.cPais,
              xPais: memberData.xPais,
              phone: memberData.phone
            }
          },
          recipient: nfceData.recipient,
          ide: {
            cUF: getUFCode(memberData.state),
            cNF: dadosNumeracao.cNF,              // ✅ Gerado automaticamente
            natOp: nfceData.ide.natOp,
            serie: nfceData.ide.serie,
            nNF: dadosNumeracao.nNF,              // ✅ Gerado automaticamente
            dhEmi: new Date().toISOString(),      // ✅ Gerado automaticamente
            tpNF: "1",
            idDest: "1",
            cMunFG: memberData.cityCode,
            tpImp: "4",
            tpEmis: "1",
            tpAmb: environment.toString(),
            finNFe: "1",
            indFinal: "1",
            indPres: "1",
            indIntermed: "0",
            procEmi: "0",
            verProc: "1.0"
          },
          products: nfceData.products,
          technicalResponsible: nfceData.technicalResponsible,
          taxes: {
            orig: "0",
            CSOSN: memberData.crt === "1" ? "102" : "400",
            CST_PIS: "49",
            CST_COFINS: "49"
          },
          payment: nfceData.payment,
          transport: nfceData.transport || { mode: "9" }
        };

        // 4. Emitir NFCe
        const resultado = await this.sefazNfceService.emitirNFCe(nfceDataCompleta, certificateConfig);

        if (resultado.success) {
          // 5. ✅ Extrair valor total do XML assinado
          let totalValue = 0;
          
          if (resultado.xmlSigned) {
            const vNFMatch = resultado.xmlSigned.match(/<vNF>([\d.,]+)<\/vNF>/);
            if (vNFMatch) {
              totalValue = parseFloat(vNFMatch[1]);
            }
          }
          
          // Fallback: calcular do JSON se não extrair do XML
          if (totalValue === 0 && nfceData.products && Array.isArray(nfceData.products)) {
            totalValue = nfceData.products.reduce((sum: number, produto: any) => {
              return sum + parseFloat(produto.vProd || '0');
            }, 0);
          }

          // ✅ Extrair QR Code do XML assinado
          let qrCode = null;
          
          if (resultado.xmlSigned) {
            const qrMatch = resultado.xmlSigned.match(/<qrCode>\s*(https?:\/\/[^\s<]+)\s*<\/qrCode>/s);
            
            if (qrMatch) {
              qrCode = qrMatch[1].trim();
            } else {
              // Fallback: busca manual
              const qrStart = resultado.xmlSigned.indexOf('<qrCode>');
              const qrEnd = resultado.xmlSigned.indexOf('</qrCode>');
              
              if (qrStart !== -1 && qrEnd !== -1) {
                const qrContent = resultado.xmlSigned.substring(qrStart + 8, qrEnd).trim();
                if (qrContent.startsWith('http')) {
                  qrCode = qrContent;
                }
              }
            }
          }

          // ✅ Extrair chave de acesso do XML assinado se necessário
          let accessKey = resultado.accessKey;
          if (!accessKey && resultado.xmlSigned) {
            const keyMatch = resultado.xmlSigned.match(/Id="NFe([0-9]{44})"/);
            if (keyMatch) {
              accessKey = keyMatch[1];
            }
          }

          // ✅ Extrair protocolo se necessário
          let protocol = resultado.protocol;
          if (!protocol && resultado.xmlComplete) {
            const protocolMatch = resultado.xmlComplete.match(/<nProt>([^<]+)<\/nProt>/);
            if (protocolMatch) {
              protocol = protocolMatch[1];
            }
          }

          console.log(`✅ NFCe processada - Valor: R$ ${totalValue.toFixed(2)}, QR Code: ${qrCode ? 'OK' : 'FALHA'}`);

          // 6. Salvar NFCe no banco com dados extraídos do XML assinado
          await connection.execute(
            `INSERT INTO invoices (
              member_id, access_key, number, cnf, series, issue_date, total_value, 
              status, protocol, environment, operation_nature, recipient_cpf, recipient_name,
              xml_content, qr_code
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberData.id,
              accessKey,
              dadosNumeracao.nNF.padStart(9, '0'),
              dadosNumeracao.cNF,
              nfceData.ide.serie,
              totalValue,  // ✅ Valor extraído do XML assinado
              'authorized',
              protocol,
              environment.toString(),
              nfceData.ide.natOp,
              nfceData.recipient?.cpf || null,
              nfceData.recipient?.xName || null,
              resultado.xmlSigned,  // ✅ XML assinado (não da resposta SEFAZ)
              qrCode  // ✅ QR Code extraído do XML assinado
            ]
          );

          reply.status(200).send({
            success: true,
            message: 'NFCe issued successfully',
            data: {
              accessKey: accessKey,
              protocol: protocol,
              number: dadosNumeracao.nNF,
              series: nfceData.ide.serie,
              totalValue: totalValue,  // ✅ Valor do XML
              dateTime: resultado.dateTime,
              status: resultado.cStat,
              reason: resultado.reason,
              qrCode: qrCode,  // ✅ QR Code do XML
              company: {
                cnpj: memberData.cnpj,
                name: memberData.xName
              },
              numbering: {
                nNF: dadosNumeracao.nNF,
                cNF: dadosNumeracao.cNF
              }
            }
          });
        } else {
          // 7. Em caso de falha, calcular valor do JSON
          const totalValue = nfceData.products.reduce((sum: number, produto: any) => {
            return sum + parseFloat(produto.vProd || '0');
          }, 0);

          console.error(`❌ NFCe rejeitada - Valor: R$ ${totalValue.toFixed(2)}, Erro: ${resultado.reason || resultado.error}`);

          // ✅ Salvar NFCe rejeitada no banco para auditoria
          await connection.execute(
            `INSERT INTO invoices (
              member_id, access_key, number, cnf, series, issue_date, total_value, 
              status, protocol, environment, operation_nature, recipient_cpf, recipient_name,
              xml_content, rejection_reason
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberData.id,
              resultado.accessKey || `TEMP_${Date.now()}`,
              dadosNumeracao.nNF.padStart(9, '0'),
              dadosNumeracao.cNF,
              nfceData.ide.serie,
              totalValue,  // ✅ Valor total correto
              'denied',
              resultado.protocol || null,
              environment.toString(),
              nfceData.ide.natOp,
              nfceData.recipient?.cpf || null,
              nfceData.recipient?.xName || null,
              resultado.xmlComplete,
              resultado.reason || resultado.error
            ]
          );
          
          reply.status(400).send({
            success: false,
            message: 'Error issuing NFCe',
            error: resultado.reason || resultado.error,
            data: {
              totalValue: totalValue,  // ✅ Valor total correto
              cStat: resultado.cStat,
              reason: resultado.reason
            },
            numbering: {             // ✅ Incluir dados de numeração mesmo em caso de erro
              nNF: dadosNumeracao.nNF,
              cNF: dadosNumeracao.cNF
            }
          });
        }

      } finally {
        await connection.end();
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

      // 1. Cancelamento via service
      const resultado = await this.sefazNfceService.cancelarNFCe(dadosCancelamento, certificate);

      // 2. ✅ Se cancelamento foi bem-sucedido, atualizar no banco
      if (resultado.success) {
        const dbConfig = getDatabaseConfig();
        const connection = await createDatabaseConnection(dbConfig);

        try {
          // Verificar se NFCe existe no banco
          const [rows] = await connection.execute(`
            SELECT i.id, i.member_id, i.number, i.series, m.cnpj, m.company_name
            FROM invoices i
            INNER JOIN member m ON i.member_id = m.id
            WHERE i.access_key = ?
          `, [accessKey]);

          if ((rows as any[]).length > 0) {
            const nfce = (rows as any[])[0];

            // Atualizar status para cancelado
            await connection.execute(`
              UPDATE invoices 
              SET 
                status = 'cancelled',
                updated_at = NOW(),
                rejection_reason = ?
              WHERE access_key = ?
            `, [
              `Cancelamento: ${justification}`,
              accessKey
            ]);

            console.log(`✅ NFCe cancelada no banco - ID: ${nfce.id}, CNPJ: ${nfce.cnpj}, Chave: ${accessKey}`);

            // Resposta com dados completos
            reply.status(200).send({
              success: true,
              message: 'NFCe cancelled successfully',
              data: {
                accessKey: accessKey,
                protocol: resultado.protocol,
                number: nfce.number,
                series: nfce.series,
                justification: justification,
                cancelDate: new Date().toISOString(),
                company: {
                  cnpj: nfce.cnpj,
                  name: nfce.company_name
                },
                sefaz: {
                  cStat: resultado.cStat,
                  reason: resultado.reason,
                  protocol: resultado.protocol
                }
              }
            });
          } else {
            console.warn(`⚠️ NFCe não encontrada no banco local - Chave: ${accessKey}`);
            
            // Cancelamento OK na SEFAZ, mas não encontrada no banco local
            reply.status(200).send({
              success: true,
              message: 'NFCe cancelled successfully in SEFAZ (not found in local database)',
              data: {
                accessKey: accessKey,
                protocol: resultado.protocol,
                justification: justification,
                cancelDate: new Date().toISOString(),
                warning: 'NFCe not found in local database',
                sefaz: {
                  cStat: resultado.cStat,
                  reason: resultado.reason,
                  protocol: resultado.protocol
                }
              }
            });
          }
        } finally {
          await connection.end();
        }
      } else {
        // ❌ Cancelamento rejeitado pela SEFAZ
        reply.status(400).send({
          success: false,
          message: 'NFCe cancellation rejected by SEFAZ',
          error: resultado.reason || 'Unknown error',
          data: {
            accessKey: accessKey,
            cStat: resultado.cStat,
            reason: resultado.reason,
            justification: justification
          }
        });
      }

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

  async inicializarTabelasNumeracao(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await this.numeracaoService.inicializarTabelas();
      
      reply.status(200).send({
        success: true,
        message: 'Numbering tables initialized successfully'
      });
      
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Error initializing numbering tables',
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
          serial_number VARCHAR(100),
          issuer VARCHAR(255),
          valid_from DATE,
          valid_to DATE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
          INDEX idx_member_active (member_id, is_active),
          INDEX idx_environment (environment),
          INDEX idx_uf (uf)
        )
      `;

      // SQL para criar tabela de notas fiscais - COMPLETA COM XML E QR CODE
      const createInvoicesTable = `
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          access_key VARCHAR(44) NOT NULL UNIQUE,
          number VARCHAR(20) NOT NULL,                 -- Número sequencial da NFCe (nNF)
          cnf VARCHAR(8),                              -- ✅ Código numérico da NFCe (cNF)
          series VARCHAR(10) NOT NULL,
          issue_date TIMESTAMP NOT NULL,
          total_value DECIMAL(15,2) NOT NULL,
          status VARCHAR(50) NOT NULL,                 -- draft, sent, authorized, denied, cancelled
          protocol VARCHAR(100),
          xml_content LONGTEXT,                        -- ✅ XML completo da NFCe
          qr_code TEXT,                                -- ✅ QR Code da NFCe
          rejection_reason TEXT,                       -- ✅ Motivo de rejeição
          
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

      await connection.end();        reply.status(200).send({
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

  async consultarNFCeSalva(request: FastifyRequest<{
    Params: { accessKey: string }
  }>, reply: FastifyReply): Promise<void> {
    try {
      const { accessKey } = request.params;
      
      const dbConfig = getDatabaseConfig();
      const connection = await createDatabaseConnection(dbConfig);
      
      try {
        const [rows] = await connection.execute(`
          SELECT 
            i.*,
            m.cnpj,
            m.company_name,
            m.trade_name
          FROM invoices i
          INNER JOIN member m ON i.member_id = m.id
          WHERE i.access_key = ?
        `, [accessKey]);
        
        if ((rows as any[]).length === 0) {
          reply.status(404).send({
            success: false,
            message: 'NFCe not found in database',
            error: `No NFCe found with access key: ${accessKey}`
          });
          return;
        }
        
        const nfce = (rows as any[])[0];
        
        reply.status(200).send({
          success: true,
          message: 'NFCe retrieved successfully',
          data: {
            id: nfce.id,
            accessKey: nfce.access_key,
            number: nfce.number,
            cnf: nfce.cnf,
            series: nfce.series,
            issueDate: nfce.issue_date,
            totalValue: parseFloat(nfce.total_value),
            status: nfce.status,
            protocol: nfce.protocol,
            qrCode: nfce.qr_code,
            xmlContent: nfce.xml_content,
            rejectionReason: nfce.rejection_reason,
            environment: nfce.environment,
            operationNature: nfce.operation_nature,
            recipientCpf: nfce.recipient_cpf,
            recipientName: nfce.recipient_name,
            company: {
              cnpj: nfce.cnpj,
              name: nfce.company_name,
              tradeName: nfce.trade_name
            },
            createdAt: nfce.created_at,
            updatedAt: nfce.updated_at
          }
        });
        
      } finally {
        await connection.end();
      }
      
    } catch (error: any) {
      console.error('Error retrieving NFCe:', error);
      reply.status(500).send({
        success: false,
        message: 'Error retrieving NFCe',
        error: error.message
      });
    }
  }
}
