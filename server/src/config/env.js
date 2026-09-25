const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || (isProd ? (() => { throw new Error('JWT_SECRET debe estar configurado estrictamente en las variables de entorno para producción.'); })() : 'valetec_dev_secret_key'),
  corsOrigin: isProd ? (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*' ? process.env.CORS_ORIGIN : 'http://localhost:3000') : (process.env.CORS_ORIGIN || 'http://localhost:3000'),

  // Database Connection (PostgreSQL 16) - Soporte para variables estándar y bilingües
  dbClient: process.env.DB_CLIENT || 'postgres',
  pgHost: process.env.PGHOST || process.env.BD_HOST || process.env.DB_HOST || 'localhost',
  pgPort: parseInt(process.env.PGPORT || process.env.BD_PUERTO || process.env.DB_PORT, 10) || 5434,
  pgUser: process.env.PGUSER || process.env.BD_USUARIO || process.env.DB_USER || 'valetec_user',
  pgPassword: process.env.PGPASSWORD || process.env.BD_CONTRASENA || process.env.DB_PASSWORD || (isProd ? (() => { throw new Error('PGPASSWORD o BD_CONTRASENA debe estar configurado estrictamente en las variables de entorno para producción.'); })() : ''),
  pgDatabase: process.env.PGDATABASE || process.env.BD_NOMBRE || process.env.DB_NAME || 'valetec_pharma'
};

module.exports = config;
