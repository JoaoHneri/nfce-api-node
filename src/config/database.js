// src/config/database.ts
import mysql from 'mysql2/promise';


export const getDatabaseConfig = () => {
  return {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || ''),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || ''
  };
};

export const createDatabaseConnection = (config) => {
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};
