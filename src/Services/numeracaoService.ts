// src/Services/numeracaoService.ts
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { DatabaseConfig } from '../config/database';

export interface ConfiguracaoNumeracao {
  cnpj: string;
  uf: string;
  serie: string;
  ambiente: '1' | '2';
}

export interface DadosNumeracao {
  nNF: string;
  cNF: string;
}

export class NumeracaoService {
  private connectionPool: mysql.Pool;

  constructor(connectionConfig: DatabaseConfig) {
    this.connectionPool = mysql.createPool({
      ...connectionConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  /**
   * Obtém próximo número com controle atômico (SEM modelo fixo)
   */
  async obterProximoNumeroSeguro(config: ConfiguracaoNumeracao): Promise<string> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      // 1. Iniciar transação para controle atômico
      await connection.beginTransaction();
      
      // 2. Buscar último número com LOCK para evitar race condition
      const [rows] = await connection.execute(`
        SELECT MAX(CAST(i.number AS UNSIGNED)) as ultimo_numero
        FROM invoices i
        INNER JOIN member m ON i.member_id = m.id
        WHERE m.cnpj = ? 
          AND i.series = ? 
          AND i.environment = ?
        FOR UPDATE
      `, [config.cnpj, config.serie, config.ambiente]);
      
      const ultimoNumero = (rows as any[])[0]?.ultimo_numero || 0;
      const proximoNumero = ultimoNumero + 1;
      
      // 3. Commit da transação
      await connection.commit();
      
      // Log only in development
      if (process.env.NODE_ENV !== 'production') {
        // Só loga em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log(`✅ Próximo número: ${proximoNumero} para CNPJ: ${config.cnpj}, Série: ${config.serie}, Ambiente: ${config.ambiente}`);
        }
      }
      
      // ✅ Retornar SEM zeros à esquerda para o XML (schema da SEFAZ)
      return proximoNumero.toString();
      
    } catch (error) {
      // Rollback em caso de erro
      await connection.rollback();
      console.error('❌ Erro crítico ao obter próximo número:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Gera numeração completa com validação
   */
  async gerarProximaNumeracao(config: ConfiguracaoNumeracao): Promise<DadosNumeracao> {
    const maxTentativas = 3;
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        // 1. Obter próximo nNF (já é atômico e seguro)
        const nNF = await this.obterProximoNumeroSeguro(config);
        
        // 2. Gerar cNF único
        const cNF = await this.gerarCodigoNumericoSeguro(config);
        
        if (process.env.NODE_ENV !== 'production') {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`✅ Numeração gerada - nNF: ${nNF}, cNF: ${cNF} (tentativa ${tentativa})`);
          }
        }
        
        return { nNF, cNF };
        
      } catch (error) {
        if (tentativa === maxTentativas) {
          throw error;
        }
        
        await this.delay(tentativa * 200);
      }
    }
    
    throw new Error(`Não foi possível gerar numeração após ${maxTentativas} tentativas`);
  }

  /**
   * Obtém apenas o próximo número (método simplificado para compatibilidade)
   */
  async obterProximoNumero(config: ConfiguracaoNumeracao): Promise<string> {
    const dados = await this.gerarProximaNumeracao(config);
    return dados.nNF;
  }

  /**
   * Gera código numérico único e seguro
   */
  async gerarCodigoNumericoSeguro(config: ConfiguracaoNumeracao): Promise<string> {
    const maxTentativas = 5;
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      const codigoGerado = this.gerarCodigoUnico(config);
      
      // Verificar se já existe no banco
      const existe = await this.verificarCNFExistente(codigoGerado, config);
      
      if (!existe) {
        return codigoGerado;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ cNF duplicado detectado: ${codigoGerado} (tentativa ${tentativa})`);
      }
      await this.delay(tentativa * 10);
    }
    
    throw new Error(`Não foi possível gerar cNF único após ${maxTentativas} tentativas`);
  }

  /**
   * Gera código único com múltiplas fontes de entropia
   */
  private gerarCodigoUnico(config: ConfiguracaoNumeracao): string {
    const agora = Date.now();
    const hrTime = process.hrtime.bigint();
    const random1 = Math.floor(Math.random() * 999999999);
    const random2 = Math.floor(Math.random() * 999999999);
    
    const entrada = [
      agora,
      hrTime.toString(),
      random1,
      random2,
      config.cnpj,
      config.uf,
      config.serie,
      process.pid
    ].join('_');
    
    const hash = crypto.createHash('sha256').update(entrada).digest('hex');
    const codigo = parseInt(hash.substr(0, 16), 16).toString().substr(-8).padStart(8, '0');
    
    return codigo;
  }

  /**
   * Verifica se cNF já existe no banco
   */
  private async verificarCNFExistente(cnf: string, config: ConfiguracaoNumeracao): Promise<boolean> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 1 FROM invoices i
        INNER JOIN member m ON i.member_id = m.id
        WHERE i.cnf = ?
          AND m.cnpj = ?
          AND i.series = ?
          AND i.environment = ?
        LIMIT 1
      `, [cnf, config.cnpj, config.serie, config.ambiente]);

      return (rows as any[]).length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Libera numeração em caso de erro
   */
  async liberarNumeracaoReservada(
    config: ConfiguracaoNumeracao,
    numero: string,
    motivo: string
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`⚠️ Numeração ${numero} liberada para ${config.cnpj}: ${motivo}`);
      }
    }
    // Não precisa fazer nada, pois o próximo número será calculado dinamicamente
  }

  /**
   * Obtém estatísticas de numeração
   */
  async obterEstatisticasNumeracao(config: ConfiguracaoNumeracao): Promise<{
    proximoNumero: number;
    totalAutorizadas: number;
    totalRejeitadas: number;
    ultimaEmissao: Date | null;
    ultimosNumeros: string[];
  }> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          MAX(CAST(i.number AS UNSIGNED)) as ultimo_numero,
          COUNT(CASE WHEN i.status = 'authorized' THEN 1 END) as total_autorizadas,
          COUNT(CASE WHEN i.status = 'denied' THEN 1 END) as total_rejeitadas,
          MAX(i.created_at) as ultima_emissao,
          GROUP_CONCAT(i.number ORDER BY i.created_at DESC LIMIT 10) as ultimos_numeros
        FROM invoices i
        INNER JOIN member m ON i.member_id = m.id
        WHERE m.cnpj = ? 
          AND i.series = ? 
          AND i.environment = ?
      `, [config.cnpj, config.serie, config.ambiente]);

      const stats = (rows as any[])[0];
      const ultimoNumero = stats?.ultimo_numero || 0;

      return {
        proximoNumero: ultimoNumero + 1,
        totalAutorizadas: stats?.total_autorizadas || 0,
        totalRejeitadas: stats?.total_rejeitadas || 0,
        ultimaEmissao: stats?.ultima_emissao || null,
        ultimosNumeros: stats?.ultimos_numeros ? stats.ultimos_numeros.split(',') : []
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Fecha o pool de conexões
   */
  async fecharConexoes(): Promise<void> {
    await this.connectionPool.end();
  }

  /**
   * Delay em milissegundos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
