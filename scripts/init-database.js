// scripts/init-database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    // Criar banco se não existir
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'nfce_api'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Database created/verified successfully');

    // Usar o banco
    await connection.query(`USE ${process.env.DB_NAME || 'nfce_api'}`);

    // Criar tabelas
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

    console.log('✅ Tables created successfully');
    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
