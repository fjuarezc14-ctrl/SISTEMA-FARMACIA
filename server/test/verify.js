const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { query, get, transaction, pool } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seedDatabase } = require('../src/db/seed');

async function runAllTests() {
  console.log('🧪 Iniciando batería de pruebas con POSTGRESQL 16...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  try {
    // 1. Migraciones y Existencia de Tablas en PostgreSQL
    await test('Tablas maestras creadas correctamente en PostgreSQL', async () => {
      await runMigrations();
      const tables = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      const tableNames = tables.map(t => t.table_name);
      const expected = ['caja_movimientos', 'caja_turnos', 'categorias', 'lotes_fefo', 'productos', 'recetas_digemid', 'roles', 'usuarios', 'ventas', 'ventas_detalles'];
      expected.forEach(tbl => {
        assert(tableNames.includes(tbl), `Falta la tabla obligatoria: ${tbl}`);
      });
    });

    // 2. Seeding y Verificación de Integridad
    await test('Sembrado inicial de datos maestros completado en PostgreSQL', async () => {
      await seedDatabase();
      const productsCount = await get('SELECT COUNT(*) AS count FROM productos');
      assert.strictEqual(parseInt(productsCount.count, 10) >= 8, true);
      
      const usersCount = await get('SELECT COUNT(*) AS count FROM usuarios');
      assert.strictEqual(parseInt(usersCount.count, 10) >= 5, true);
    });

    // 3. Verificación de Transaccionalidad ACID (Rollback en PostgreSQL)
    await test('Transacciones ACID con Rollback automático ante fallos en PostgreSQL', async () => {
      const countBefore = await get('SELECT COUNT(*) AS count FROM categorias');
      try {
        await transaction(async ({ run }) => {
          await run("INSERT INTO categorias (slug, name) VALUES ('test_temp', 'Categoría Temporal')");
          throw new Error('Simulación de error imprevisto a mitad de operación');
        });
      } catch (expectedErr) {
        // Rollback esperado
      }
      const countAfter = await get('SELECT COUNT(*) AS count FROM categorias');
      assert.strictEqual(countBefore.count, countAfter.count, 'El Rollback falló en PostgreSQL');
    });

    // 4. Verificación de Restricción de Llaves Foráneas (Foreign Keys)
    await test('Integridad Referencial Estricta (FK Constraints rechazando huérfanos en PG)', async () => {
      let rejected = false;
      try {
        await pool.query(`
          INSERT INTO productos 
          (barcode, name, generic_dci, laboratory, category_id, location, box_price, blister_price, unit_price)
          VALUES ('TEST_BARCODE_FAIL', 'Med Test', 'DCI Test', 'Lab Test', 999999, 'Pasillo X', 10, 1, 0.1)
        `);
      } catch (err) {
        rejected = true;
        assert(err.message.includes('foreign key') || err.message.includes('violates foreign key constraint'));
      }
      assert.strictEqual(rejected, true, 'PostgreSQL permitió insertar producto sin categoría válida');
    });

    // 5. Servidor Express y Rutas HTTP
    await test('Servidor Express levanta y responde endpoints REST con PostgreSQL', async () => {
      const server = http.createServer(app);
      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const healthRes = await fetch(`${baseUrl}/api/health`);
        assert.strictEqual(healthRes.status, 200);
        const healthData = await healthRes.json();
        assert.strictEqual(healthData.success, true);
        assert.strictEqual(healthData.database.status.includes('PostgreSQL'), true);

        const prodRes = await fetch(`${baseUrl}/api/test/products`);
        assert.strictEqual(prodRes.status, 200);
        const prodData = await prodRes.json();
        assert.strictEqual(prodData.count >= 8, true);

        const userRes = await fetch(`${baseUrl}/api/test/users`);
        assert.strictEqual(userRes.status, 200);
        const userData = await userRes.json();
        assert.strictEqual(userData.data.every(u => !u.password_hash && !u.password), true);

        const statsRes = await fetch(`${baseUrl}/api/test/stats`);
        assert.strictEqual(statsRes.status, 200);
        const statsData = await statsRes.json();
        assert.strictEqual(statsData.stats.totalProducts >= 8, true);

      } finally {
        server.close();
      }
    });

    console.log(`\n====================================================`);
    console.log(`📊 RESULTADO DE PRUEBAS POSTGRESQL:`);
    console.log(`   Superadas: ${passed}`);
    console.log(`   Fallidas:  ${failed}`);
    console.log(`====================================================\n`);

  } finally {
    await pool.end();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Error fatal durante la suite de pruebas:', err);
  process.exit(1);
});
