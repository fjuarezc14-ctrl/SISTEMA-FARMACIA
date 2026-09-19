const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../db/pharmacy.db'),
  jwtSecret: process.env.JWT_SECRET || 'valetec_dev_secret_key_change_in_production',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Normalize db path if relative
if (!path.isAbsolute(config.dbPath)) {
  config.dbPath = path.resolve(__dirname, '../../', config.dbPath);
}

module.exports = config;
