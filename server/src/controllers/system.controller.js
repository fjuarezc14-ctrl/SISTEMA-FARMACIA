const { spawn } = require('child_process');
const config = require('../config/env');
const { get, query } = require('../db');

/**
 * GET /api/system/backup
 * Generar y descargar volcado completo de la base de datos PostgreSQL 16 (Solo Administrador)
 */
async function generateBackup(req, res, next) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `valetec_pharma_backup_${timestamp}.sql`;

    // Si el cliente solicita modo JSON informativo (para verificación/auditoría rápida)
    if (req.query.mode === 'json') {
      const tables = await query(`
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename ASC;
      `);

      const dbStats = await get(`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
      `);

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Servicio de volcado automatizado PostgreSQL 16 activo.',
        database: config.pgDatabase,
        databaseSize: dbStats ? dbStats.db_size : 'N/A',
        tablesCount: tables.length,
        tables: tables.map(t => t.tablename),
        downloadUrl: '/api/system/backup',
        timestamp: new Date().toISOString()
      });
    }

    // Cabeceras HTTP para forzar descarga segura del archivo SQL
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Database-Engine', 'PostgreSQL 16');

    const env = {
      ...process.env,
      PGPASSWORD: config.pgPassword
    };

    const dumpArgs = [
      '-h', config.pgHost,
      '-p', config.pgPort.toString(),
      '-U', config.pgUser,
      '-d', config.pgDatabase,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--schema=public'
    ];

    const child = spawn('pg_dump', dumpArgs, { env });

    child.stdout.pipe(res);

    let stderrData = '';
    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('error', (err) => {
      console.error('[BACKUP] Error al invocar pg_dump:', err);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          statusCode: 500,
          message: `Error al ejecutar pg_dump en el servidor: ${err.message}`
        });
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[BACKUP] pg_dump finalizó con código de error ${code}: ${stderrData}`);
      } else {
        console.log(`[BACKUP] Volcado de PostgreSQL 16 emitido con éxito: ${filename}`);
      }
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateBackup
};
