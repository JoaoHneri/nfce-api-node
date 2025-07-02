// src/config/database.ts
import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || ''),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || ''
  };
};

export const createDatabaseConnection = (config: DatabaseConfig): mysql.Pool => {
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};
