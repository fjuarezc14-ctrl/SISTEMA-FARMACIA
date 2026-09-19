const app = require('./src/app');
const config = require('./src/config/env');
const { runMigrations } = require('./src/db/migrate');
const { seedDatabase } = require('./src/db/seed');
const { get } = require('./src/db');

function startServer() {
  try {
    console.log('====================================================');
    console.log('   VALETEC PHARMA v2 - SERVIDOR BACKEND (NODE.JS)   ');
    console.log('====================================================');

    // Auto-run migrations on startup
    runMigrations();

    // Check if database needs initial seeding
    const productCount = get('SELECT COUNT(*) AS count FROM productos');
    if (!productCount || productCount.count === 0) {
      console.log('ℹ️ Base de datos vacía detectada. Ejecutando sembrado inicial...');
      seedDatabase();
    } else {
      console.log(`✅ Base de datos lista (${productCount.count} productos registrados).`);
    }

    // Start Express listener
    const server = app.listen(config.port, () => {
      console.log('----------------------------------------------------');
      console.log(`🚀 Servidor ejecutándose en: http://localhost:${config.port}`);
      console.log(`🩺 Health Check:             http://localhost:${config.port}/api/health`);
      console.log(`📦 Catálogo de Prueba:       http://localhost:${config.port}/api/test/products`);
      console.log(`👥 Personal de Turno:        http://localhost:${config.port}/api/test/users`);
      console.log(`📊 Métricas del Sistema:     http://localhost:${config.port}/api/test/stats`);
      console.log('----------------------------------------------------');
    });

    // Graceful Shutdown
    const shutdown = (signal) => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor limpiamente...`);
      server.close(() => {
        console.log('👋 Servidor VALETEC PHARMA cerrado con éxito.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
