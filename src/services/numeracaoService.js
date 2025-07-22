// src/services/numeracaoService.js
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { getDatabaseConfig } from '../config/database.js';

export class NumeracaoService {
  constructor(connectionConfig) {
    this.connectionPool = mysql.createPool({
      ...connectionConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async obterProximoNumeroSeguro(config) {
    const connection = await this.connectionPool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(`
        SELECT MAX(CAST(i.number AS UNSIGNED)) as ultimo_numero
        FROM invoices i
        INNER JOIN member m ON i.member_id = m.id
        WHERE m.cnpj = ? 
          AND i.series = ? 
          AND i.environment = ?
        FOR UPDATE
      `, [config.cnpj, config.serie, config.ambiente]);
      const ultimoNumero = (rows)[0]?.ultimo_numero || 0;
      const proximoNumero = ultimoNumero + 1;
      await connection.commit();
      return proximoNumero.toString();
    } catch (error) {
      await connection.rollback();
      console.error('❌ Erro crítico ao obter próximo número:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async gerarProximaNumeracao(config) {
    const maxTentativas = 3;
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const nNF = await this.obterProximoNumeroSeguro(config);
        const cNF = await this.gerarCodigoNumericoSeguro(config);
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

  async obterProximoNumero(config) {
    const dados = await this.gerarProximaNumeracao(config);
    return dados.nNF;
  }

  async gerarCodigoNumericoSeguro(config) {
    const maxTentativas = 5;
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      const codigoGerado = this.gerarCodigoUnico(config);
      const existe = await this.verificarCNFExistente(codigoGerado, config);
      if (!existe) {
        return codigoGerado;
      }
      await this.delay(tentativa * 10);
    }
    throw new Error(`Não foi possível gerar cNF único após ${maxTentativas} tentativas`);
  }

  gerarCodigoUnico(config) {
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

  async verificarCNFExistente(cnf, config) {
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
      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async liberarNumeracaoReservada(config, numero, motivo) {
    // Não precisa fazer nada, pois o próximo número será calculado dinamicamente
  }

  async obterEstatisticasNumeracao(config) {
    const connection = await this.connectionPool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          MAX(CAST(i.number AS UNSIGNED)) as ultimo_numero,
          COUNT(CASE WHEN i.status = 'authorized' THEN 1 END) as total_autorizadas,
          COUNT(CASE WHEN i.status = 'denied' THEN 1 END) as total_rejeitadas,
          MAX(i.created_at) as ultima_emissao,
          (
            SELECT GROUP_CONCAT(sub.number ORDER BY sub.created_at DESC)
            FROM (
              SELECT i2.number, i2.created_at
              FROM invoices i2
              INNER JOIN member m2 ON i2.member_id = m2.id
              WHERE m2.cnpj = ? 
                AND i2.series = ? 
                AND i2.environment = ?
              ORDER BY i2.created_at DESC
              LIMIT 10
            ) sub
          ) as ultimos_numeros
        FROM invoices i
        INNER JOIN member m ON i.member_id = m.id
        WHERE m.cnpj = ? 
          AND i.series = ? 
          AND i.environment = ?
      `, [config.cnpj, config.serie, config.ambiente, config.cnpj, config.serie, config.ambiente]);
      const stats = rows[0];
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

  async fecharConexoes() {
    await this.connectionPool.end();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
