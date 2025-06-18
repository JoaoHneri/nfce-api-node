import { Request, Response } from 'express';
import { SefazNfceService } from '../Services/sefazNfceService';
import { NFCeData, CertificadoConfig, CancelamentoRequest } from '../types';
import fs from 'fs';
import path from 'path';

export class NFCeController {
  private sefazNfceService: SefazNfceService;

  constructor() {
    // Carregar configuração do certificado
    const certificadoConfig = this.carregarConfigCertificado();
    this.sefazNfceService = new SefazNfceService(certificadoConfig, 'homologacao');
  }

  // Emitir NFCe
  async emitirNFCe(req: Request, res: Response): Promise<void> {
    try {
      const dadosNFCe: NFCeData = req.body;

      console.log('📝 Iniciando emissão de NFCe...');

      // 1. Criar XML da NFCe
      const xmlNFCe = await this.sefazNfceService.criarNFCe(dadosNFCe);
      console.log('✅ XML da NFCe criado');

      // 2. Assinar XML
      const xmlAssinado = await this.sefazNfceService.assinarXML(xmlNFCe);
      console.log('✅ XML assinado');

      // 3. Salvar XMLs para debug
      await this.sefazNfceService.salvarArquivo(xmlNFCe, 'nfce_original');
      await this.sefazNfceService.salvarArquivo(xmlAssinado, 'nfce_assinado');

      // 4. Enviar para SEFAZ
      const resultado = await this.sefazNfceService.enviarParaSefaz(xmlAssinado);
      console.log('📡 Enviado para SEFAZ');

      if (resultado.xmlCompleto) {
        await this.sefazNfceService.salvarArquivo(resultado.xmlCompleto, 'sefaz_resposta');
      }

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

  // Consultar status do serviço SEFAZ
  async consultarStatusSefaz(req: Request, res: Response): Promise<void> {
    try {
      const { uf = 'SP' } = req.query;

      console.log(`🔍 Consultando status da SEFAZ ${uf}...`);

      const resultado = await this.sefazNfceService.consultarStatusServico(uf as string);

      if (resultado.sucesso || resultado.cStat === '107') {
        res.status(200).json({
          sucesso: true,
          mensagem: 'Status da SEFAZ consultado com sucesso',
          dados: {
            status: resultado.cStat,
            motivo: resultado.xMotivo,
            dataHora: resultado.dataHora
          }
        });
      } else {
        res.status(400).json({
          sucesso: false,
          mensagem: 'Erro ao consultar status da SEFAZ',
          erro: resultado.xMotivo || resultado.erro
        });
      }

    } catch (error: any) {
      console.error('❌ Erro ao consultar status:', error.message);

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

  // Obter exemplo de JSON para NFCe
  async obterExemplo(req: Request, res: Response): Promise<void> {
    const exemplo: NFCeData = {
      emitente: {
        CNPJ: "60142655000126",
        xNome: "YELLOWSTONE MINERACAO CRIATIVA LTDA",
        xFant: "NOME FANTASIA",
        IE: "153453205111",
        CRT: "1",
        endereco: {
          xLgr: "AV GUILHERME CAMPOS",
          nro: "500",
          xBairro: "JARDIM SANTA GENERRA",
          cMun: "3550308",
          xMun: "SÃO PAULO",
          UF: "SP",
          CEP: "13087901",
          cPais: "1058",
          xPais: "BRASIL",
          fone: "5481439700"
        }
      },
      destinatario: {
        CPF: "10426174577",
        xNome: "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        indIEDest: "9"
      },
      ide: {
        cUF: "35",
        cNF: "00002024",
        natOp: "VENDA",
        serie: "0",
        nNF: "252",
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
        verProc: "4.13"
      },
      produtos: [
        {
          cProd: "001",
          cEAN: "SEM GTIN",
          xProd: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
          NCM: "85044010",
          CFOP: "5102",
          uCom: "UNID",
          qCom: "1.0000",
          vUnCom: "100.00",
          vProd: "100.00",
          cEANTrib: "SEM GTIN",
          uTrib: "UNID",
          qTrib: "1.0000",
          vUnTrib: "100.00",
          indTot: "1"
        }
      ],
      impostos: {
        orig: "0",
        CSOSN: "102",
        CST_PIS: "49",
        CST_COFINS: "49"
      },
      pagamento: {
        detPag: [
          {
            indPag: "0",
            tPag: "01",
            vPag: "100.00"
          }
        ],
        vTroco: "0.00"
      },
      transporte: {
        modFrete: "9"
      }
    };

    res.status(200).json({
      sucesso: true,
      mensagem: 'Exemplo de dados para emissão de NFCe',
      exemplo
    });
  }


  async consultarNFCe(req: Request, res: Response): Promise<void> {
    try {

      const { chave } = req.params;

      if (!chave) {
        res.status(400).json({
          erro: 'Chave de acesso é obrigatória',
          status: 400
        });
        return;
      }

      const resultado = await this.sefazNfceService.consultarNFCe(chave);

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
      const { chaveAcesso, protocolo, justificativa } = req.body;

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
      const resultado = await this.sefazNfceService.cancelarNFCe(dadosCancelamento);
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

  private carregarConfigCertificado(): CertificadoConfig {
    console.log('🔑 Carregando configuração do certificado...')

    return {
      pfx: process.env.CERTIFICADO_PATH || '',
      senha: process.env.CERTIFICADO_SENHA || '',
      CSC: process.env.CSC || '',
      CSCid: process.env.CSC_ID || '',
      CNPJ: process.env.CNPJ || '',
      CPF: process.env.CPF || '',
    };
  }
}