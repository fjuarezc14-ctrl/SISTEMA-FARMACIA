const fs = require('fs');
const path = require('path');
const { db, exec, query } = require('./index');

function runMigrations() {
  console.log('🔄 Ejecutando migraciones de base de datos VALETEC PHARMA...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema DDL
  exec(sql);

  // Verify created tables
  const tables = query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );

  console.log(`✅ Migraciones completadas con éxito. Tablas verificadas (${tables.length}):`);
  tables.forEach(t => console.log(`   - 📋 ${t.name}`));

  return tables.map(t => t.name);
}

// Allow direct CLI execution: node src/db/migrate.js
if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error ejecutando migraciones:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };
