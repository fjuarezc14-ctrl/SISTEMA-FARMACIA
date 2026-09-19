const { get } = require('../db');

function checkHealth(req, res) {
  let dbStatus = 'disconnected';
  let dbLatencyMs = 0;

  try {
    const start = performance.now();
    const test = get('SELECT 1 AS alive');
    dbLatencyMs = Math.round((performance.now() - start) * 100) / 100;
    if (test && test.alive === 1) {
      dbStatus = 'connected (SQLite WAL)';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const memory = process.memoryUsage();

  res.status(200).json({
    success: true,
    status: 'VALETEC PHARMA BACKEND ONLINE',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      engine: 'SQLite3 (Native DatabaseSync WAL Mode)'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryRssMb: Math.round((memory.rss / (1024 * 1024)) * 10) / 10,
      memoryHeapMb: Math.round((memory.heapUsed / (1024 * 1024)) * 10) / 10
    }
  });
}

module.exports = {
  checkHealth
};
