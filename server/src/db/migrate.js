const fs = require('fs');
const path = require('path');
const { exec, query } = require('./index');

async function runMigrations() {
  console.log('🔄 Ejecutando migraciones en PostgreSQL 16 (VALETEC PHARMA)...');
  const schemaPath = path.resolve(__dirname, 'schema.pg.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Execute PostgreSQL DDL
  await exec(sql);

  // Verify created tables
  const tables = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`✅ Migraciones completadas con éxito en PostgreSQL. Tablas (${tables.length}):`);
  tables.forEach(t => console.log(`   - 📋 ${t.table_name}`));

  return tables.map(t => t.table_name);
}

// Allow direct CLI execution: node src/db/migrate.js
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error ejecutando migraciones en PostgreSQL:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
