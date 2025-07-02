// src/Services/numeracaoService.ts
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { DadosNumeracao, ConfiguracaoNumeracao, HistoricoNumeracao } from '../types/numeracaoTypes';


export class NumeracaoService {
  private connectionPool: mysql.Pool;

  constructor(connectionConfig: mysql.ConnectionOptions) {
    this.connectionPool = mysql.createPool({
      ...connectionConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  /**
   * Gera próximo nNF e cNF de forma atômica com proteção contra concorrência
   */
  async gerarProximaNumeracao(config: ConfiguracaoNumeracao): Promise<DadosNumeracao> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      // 🔒 ISOLAMENTO SERIALIZABLE para evitar race conditions
      await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      await connection.beginTransaction();

      // 🔒 SELECT FOR UPDATE garante lock exclusivo
      const [rows] = await connection.execute(`
        SELECT proximo_nnf, ultimo_cnf 
        FROM nfce_numeracao 
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
        FOR UPDATE
      `, [config.cnpj, config.uf, config.serie, config.ambiente]);

      let proximoNNF: number;
      let ultimoCNF: number;

      if ((rows as any[]).length === 0) {
        // 🆕 Primeira numeração - INSERT com tratamento de concorrência
        proximoNNF = 1;
        ultimoCNF = 0;

        try {
          await connection.execute(`
            INSERT INTO nfce_numeracao (cnpj, uf, serie, ambiente, proximo_nnf, ultimo_cnf, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [config.cnpj, config.uf, config.serie, config.ambiente, proximoNNF + 1, ultimoCNF]);
        } catch (error: any) {
          // Se já existe (criado por outra thread), buscar novamente
          if (error.code === 'ER_DUP_ENTRY') {
            const [retryRows] = await connection.execute(`
              SELECT proximo_nnf, ultimo_cnf 
              FROM nfce_numeracao 
              WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
              FOR UPDATE
            `, [config.cnpj, config.uf, config.serie, config.ambiente]);
            
            const registro = (retryRows as any[])[0];
            proximoNNF = registro.proximo_nnf;
            ultimoCNF = registro.ultimo_cnf || 0;
          } else {
            throw error;
          }
        }
      } else {
        // 📈 Incrementar atomicamente
        const registro = (rows as any[])[0];
        proximoNNF = registro.proximo_nnf;
        ultimoCNF = registro.ultimo_cnf || 0;

        const [updateResult] = await connection.execute(`
          UPDATE nfce_numeracao 
          SET proximo_nnf = proximo_nnf + 1, updated_at = NOW()
          WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ? 
          AND proximo_nnf = ?
        `, [config.cnpj, config.uf, config.serie, config.ambiente, proximoNNF]);

        // 🚨 Verificar se UPDATE afetou uma linha (concorrência detectada)
        if ((updateResult as any).affectedRows === 0) {
          throw new Error('Concorrência detectada - tentativa de numeração simultânea');
        }
      }

      // 🎲 Gerar cNF com garantia de unicidade
      const novoCNF = await this.gerarCodigoNumericoSeguro(config, proximoNNF, connection);

      // Atualizar ultimo_cnf
      await connection.execute(`
        UPDATE nfce_numeracao 
        SET ultimo_cnf = ?, updated_at = NOW()
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
      `, [parseInt(novoCNF), config.cnpj, config.uf, config.serie, config.ambiente]);

      // 📝 Registrar no histórico com status RESERVADO
      await connection.execute(`
        INSERT INTO nfce_historico (cnpj, uf, serie, ambiente, nnf, cnf, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'RESERVADO', NOW(), NOW())
      `, [config.cnpj, config.uf, config.serie, config.ambiente, proximoNNF.toString(), novoCNF]);

      await connection.commit();

      const nNF = proximoNNF.toString();
      const cNF = novoCNF.toString();

      console.log(`🔢 Numeração gerada: ${config.uf}/${config.cnpj} - nNF=${nNF}, cNF=${cNF}`);

      return { nNF, cNF };

    } catch (error: any) {
      await connection.rollback();
      
      // 🔄 Retry automático em caso de deadlock
      if (error.code === 'ER_LOCK_DEADLOCK') {
        console.log('🔄 Deadlock detectado, tentando novamente...');
        await this.delay(Math.random() * 100); // Delay aleatório
        return this.gerarProximaNumeracao(config); // Retry
      }
      
      throw new Error(`Erro ao gerar numeração: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Atualiza status no histórico após retorno da SEFA
   */
  async atualizarStatusNumeracao(
    config: ConfiguracaoNumeracao, 
    nNF: string, 
    cNF: string, 
    status: 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA',
    chaveAcesso?: string,
    motivo?: string,
    protocolo?: string
  ): Promise<void> {
    try {
      await this.connectionPool.execute(`
        UPDATE nfce_historico 
        SET status = ?, chave_acesso = ?, motivo = ?, protocolo = ?, updated_at = NOW()
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ? AND nnf = ? AND cnf = ?
      `, [status, chaveAcesso || null, motivo || null, protocolo || null, config.cnpj, config.uf, config.serie, config.ambiente, nNF, cNF]);
      
      console.log(`📝 Status atualizado: ${status} - Protocolo: ${protocolo || 'N/A'}`);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar status da numeração:', error);
      // Não falha a operação principal por causa do histórico
    }
  }

  /**
   * Atualiza status no histórico através da chave de acesso (usado no cancelamento)
   */
  async atualizarStatusPorChave(
    chaveAcesso: string,
    status: 'CANCELADA',
    motivo?: string,
    protocolo?: string
  ): Promise<void> {
    try {
      await this.connectionPool.execute(`
        UPDATE nfce_historico 
        SET status = ?, motivo = ?, protocolo = ?, updated_at = NOW()
        WHERE chave_acesso = ?
      `, [status, motivo || null, protocolo || null, chaveAcesso]);
      
      console.log(`📝 Status atualizado via chave: ${status} - Chave: ${chaveAcesso}`);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar status por chave de acesso:', error);
      // Não falha a operação principal por causa do histórico
    }
  }

  /**
   * Registra falha na numeração para auditoria
   */
  async registrarFalhaNumeracao(
    config: ConfiguracaoNumeracao,
    nNF: string,
    cNF: string,
    erro: string
  ): Promise<void> {
    try {
      await this.connectionPool.execute(`
        INSERT INTO nfce_falhas (cnpj, uf, serie, ambiente, nnf, cnf, erro, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [config.cnpj, config.uf, config.serie, config.ambiente, nNF, cNF, erro]);
    } catch (error) {
      console.error('Erro ao registrar falha da numeração:', error);
    }
  }

  /**
   * Consulta estatísticas de numeração para uma empresa/UF/série/ambiente
   */
  async obterEstatisticasNumeracao(config: ConfiguracaoNumeracao): Promise<{
    proximoNNF: number;
    totalAutorizadas: number;
    totalRejeitadas: number;
    ultimaEmissao: Date | null;
  }> {
    try {
      // Busca próximo nNF
      const [numeracaoRows] = await this.connectionPool.execute(`
        SELECT proximo_nnf 
        FROM nfce_numeracao 
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
      `, [config.cnpj, config.uf, config.serie, config.ambiente]);

      // Busca estatísticas do histórico
      const [statsRows] = await this.connectionPool.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'AUTORIZADA' THEN 1 END) as total_autorizadas,
          COUNT(CASE WHEN status = 'REJEITADA' THEN 1 END) as total_rejeitadas,
          MAX(created_at) as ultima_emissao
        FROM nfce_historico 
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
      `, [config.cnpj, config.uf, config.serie, config.ambiente]);

      const numeracao = (numeracaoRows as any[])[0];
      const stats = (statsRows as any[])[0];

      return {
        proximoNNF: numeracao?.proximo_nnf || 1,
        totalAutorizadas: stats?.total_autorizadas || 0,
        totalRejeitadas: stats?.total_rejeitadas || 0,
        ultimaEmissao: stats?.ultima_emissao || null
      };
    } catch (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error}`);
    }
  }

  /**
   * 🎲 Geração de cNF com verificação de unicidade no banco
   */
  private async gerarCodigoNumericoSeguro(
    config: ConfiguracaoNumeracao, 
    nNF: number, 
    connection: any
  ): Promise<string> {
    let tentativas = 0;
    const maxTentativas = 50;
    
    while (tentativas < maxTentativas) {
      // 🧮 Algoritmo mais robusto
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 9999);
      const entrada = `${config.cnpj}_${config.uf}_${nNF}_${timestamp}_${random}_${tentativas}`;
      
      const hash = crypto.createHash('sha256').update(entrada).digest('hex');
      const codigo = parseInt(hash.substr(0, 12), 16).toString().substr(-8).padStart(8, '0');
      
      // ✅ Verificar unicidade no banco
      const [existe] = await connection.execute(
        'SELECT 1 FROM nfce_historico WHERE cnf = ? LIMIT 1',
        [codigo]
      );
      
      if ((existe as any[]).length === 0) {
        return codigo;
      }
      
      tentativas++;
      await this.delay(1); // Pequeno delay para evitar colisões
    }
    
    throw new Error('Falha crítica: não foi possível gerar cNF único após 50 tentativas');
  }

  /**
   * Delay em milissegundos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicializa as tabelas necessárias (apenas para desenvolvimento/testes)
   */
  async inicializarTabelas(): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      // Tabela de controle de numeração
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS nfce_numeracao (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cnpj VARCHAR(14) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          serie VARCHAR(3) NOT NULL,
          ambiente ENUM('1', '2') NOT NULL COMMENT '1=Produção, 2=Homologação',
          proximo_nnf INT NOT NULL DEFAULT 1,
          ultimo_cnf INT NOT NULL DEFAULT 0,
          total_emitidas INT NOT NULL DEFAULT 0,
          total_autorizadas INT NOT NULL DEFAULT 0,
          total_rejeitadas INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_numeracao (cnpj, uf, serie, ambiente),
          INDEX idx_consulta (cnpj, uf, serie, ambiente)
        ) ENGINE=InnoDB COMMENT='Controle de numeração sequencial NFCe'
      `);

      // Tabela de histórico/auditoria
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS nfce_historico (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cnpj VARCHAR(14) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          serie VARCHAR(3) NOT NULL,
          ambiente ENUM('1', '2') NOT NULL,
          nnf VARCHAR(9) NOT NULL,
          cnf VARCHAR(8) NOT NULL,
          chave_acesso VARCHAR(44) DEFAULT NULL,
          protocolo VARCHAR(20) DEFAULT NULL,
          status ENUM('RESERVADO', 'AUTORIZADA', 'REJEITADA', 'LIBERADA', 'CANCELADA') NOT NULL DEFAULT 'RESERVADO',
          motivo TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_numero (cnpj, uf, serie, ambiente, nnf),
          UNIQUE KEY uk_codigo (cnf),
          UNIQUE KEY uk_chave (chave_acesso),
          INDEX idx_busca (cnpj, uf, serie, ambiente, nnf, cnf),
          INDEX idx_status (status),
          INDEX idx_data (created_at)
        ) ENGINE=InnoDB COMMENT='Histórico e auditoria das numerações NFCe'
      `);

      // Tabela de falhas para debug
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS nfce_falhas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cnpj VARCHAR(14) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          serie VARCHAR(3) NOT NULL,
          ambiente ENUM('1', '2') NOT NULL,
          nnf VARCHAR(9) NOT NULL,
          cnf VARCHAR(8) NOT NULL,
          erro TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_debug (cnpj, uf, serie, ambiente),
          INDEX idx_data (created_at)
        ) ENGINE=InnoDB COMMENT='Log de falhas na numeração para debug'
      `);

      console.log('✅ Tabelas de numeração NFCe inicializadas com sucesso');
    } catch (error) {
      throw new Error(`Erro ao inicializar tabelas: ${error}`);
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
   * 🔄 Sistema de recuperação de numeração reservada
   */
  async liberarNumeracaoReservada(
    config: ConfiguracaoNumeracao,
    nNF: string,
    motivo: string
  ): Promise<void> {
    const connection = await this.connectionPool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 📝 Marcar como LIBERADA no histórico
      await connection.execute(`
        UPDATE nfce_historico 
        SET status = 'LIBERADA', motivo = ?, updated_at = NOW()
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ? AND nnf = ?
        AND status = 'RESERVADO'
      `, [motivo, config.cnpj, config.uf, config.serie, config.ambiente, nNF]);
      
      // 🔄 Decrementar contador (permitir reutilização)
      await connection.execute(`
        UPDATE nfce_numeracao 
        SET proximo_nnf = GREATEST(proximo_nnf - 1, 1), updated_at = NOW()
        WHERE cnpj = ? AND uf = ? AND serie = ? AND ambiente = ?
        AND proximo_nnf = ?
      `, [config.cnpj, config.uf, config.serie, config.ambiente, parseInt(nNF) + 1]);
      
      await connection.commit();
      
      console.log(`🔄 Numeração ${nNF} liberada: ${motivo}`);
      
    } catch (error) {
      await connection.rollback();
      console.error('❌ Erro ao liberar numeração:', error);
    } finally {
      connection.release();
    }
  }
}
