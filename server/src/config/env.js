const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || (isProd ? (() => { throw new Error('JWT_SECRET debe estar configurado estrictamente en las variables de entorno para producción.'); })() : 'valetec_dev_secret_key'),
  corsOrigin: isProd ? (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*' ? process.env.CORS_ORIGIN : 'http://localhost:3000') : (process.env.CORS_ORIGIN || 'http://localhost:3000'),

  // Database Connection (PostgreSQL)
  dbClient: process.env.DB_CLIENT || 'postgres',
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: parseInt(process.env.PGPORT, 10) || 5434,
  pgUser: process.env.PGUSER || 'valetec_user',
  pgPassword: process.env.PGPASSWORD || (isProd ? (() => { throw new Error('PGPASSWORD debe estar configurado estrictamente en las variables de entorno para producción.'); })() : ''),
  pgDatabase: process.env.PGDATABASE || 'valetec_pharma',

  // SQLite fallback path if needed
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../db/pharmacy.db')
};

module.exports = config;
