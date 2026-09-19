const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'valetec_dev_secret_key_change_in_production',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Database Connection (PostgreSQL)
  dbClient: process.env.DB_CLIENT || 'postgres',
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: parseInt(process.env.PGPORT, 10) || 5434,
  pgUser: process.env.PGUSER || 'valetec_user',
  pgPassword: process.env.PGPASSWORD || 'valetec_secure_password_2026',
  pgDatabase: process.env.PGDATABASE || 'valetec_pharma',

  // SQLite fallback path if needed
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../db/pharmacy.db')
};

module.exports = config;
