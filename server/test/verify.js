const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { query, get, transaction, db } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seedDatabase } = require('../src/db/seed');

async function runAllTests() {
  console.log('🧪 Iniciando batería de pruebas automatizadas del Módulo 1...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Migraciones y Existencia de Tablas
  test('Tablas maestras creadas correctamente en SQLite', () => {
    runMigrations();
    const tables = query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    const tableNames = tables.map(t => t.name);
    const expected = ['caja_movimientos', 'caja_turnos', 'categorias', 'lotes_fefo', 'productos', 'recetas_digemid', 'roles', 'usuarios', 'ventas', 'ventas_detalles'];
    expected.forEach(tbl => {
      assert(tableNames.includes(tbl), `Falta la tabla obligatoria: ${tbl}`);
    });
  });

  // 2. Seeding y Verificación de Integridad
  test('Sembrado inicial de datos maestros completado', () => {
    seedDatabase();
    const productsCount = get('SELECT COUNT(*) AS count FROM productos').count;
    assert.strictEqual(productsCount >= 8, true, `Se esperaban al menos 8 productos, se encontraron ${productsCount}`);
    
    const usersCount = get('SELECT COUNT(*) AS count FROM usuarios').count;
    assert.strictEqual(usersCount >= 5, true, `Se esperaban al menos 5 usuarios, se encontraron ${usersCount}`);
  });

  // 3. Verificación de Transaccionalidad ACID (Rollback)
  test('Transacciones ACID con Rollback automático ante fallos', () => {
    const countBefore = get('SELECT COUNT(*) AS count FROM categorias').count;
    try {
      transaction(({ run }) => {
        run("INSERT INTO categorias (slug, name) VALUES ('test_temp', 'Categoría Temporal')");
        throw new Error('Simulación de error imprevisto a mitad de operación');
      });
    } catch (expectedErr) {
      // Expected rollback
    }
    const countAfter = get('SELECT COUNT(*) AS count FROM categorias').count;
    assert.strictEqual(countBefore, countAfter, 'El Rollback falló: se insertó registro no autorizado');
  });

  // 4. Verificación de Restricción de Llaves Foráneas (Foreign Keys ON)
  test('Integridad Referencial Estricta (FK Constraints rechazando huérfanos)', () => {
    let rejected = false;
    try {
      // Intentar insertar producto con category_id inexistente (999999)
      const stmt = db.prepare(`
        INSERT INTO productos 
        (barcode, name, generic_dci, laboratory, category_id, location, box_price, blister_price, unit_price)
        VALUES ('TEST_BARCODE', 'Med Test', 'DCI Test', 'Lab Test', 999999, 'Pasillo X', 10, 1, 0.1)
      `);
      stmt.run();
    } catch (err) {
      rejected = true;
      assert(err.message.includes('FOREIGN KEY') || err.message.includes('constraint failed'), 'Error FK no esperado');
    }
    assert.strictEqual(rejected, true, 'La base de datos permitió insertar un producto sin categoría válida');
  });

  // 5. Servidor Express y Rutas HTTP
  await asyncTest('Servidor Express levanta y responde endpoints REST', async () => {
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // Health Check
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
      const healthData = await healthRes.json();
      assert.strictEqual(healthData.success, true);
      assert.strictEqual(healthData.database.status.includes('connected'), true);

      // Test Products Endpoint
      const prodRes = await fetch(`${baseUrl}/api/test/products`);
      assert.strictEqual(prodRes.status, 200);
      const prodData = await prodRes.json();
      assert.strictEqual(prodData.success, true);
      assert.strictEqual(prodData.count >= 8, true);
      assert.strictEqual(typeof prodData.data[0].boxPrice, 'number');

      // Test Users Endpoint (No password leakage)
      const userRes = await fetch(`${baseUrl}/api/test/users`);
      assert.strictEqual(userRes.status, 200);
      const userData = await userRes.json();
      assert.strictEqual(userData.success, true);
      assert.strictEqual(userData.data.every(u => !u.password_hash && !u.password), true, 'No debe filtrar passwords hasheados');

      // Test Stats Endpoint
      const statsRes = await fetch(`${baseUrl}/api/test/stats`);
      assert.strictEqual(statsRes.status, 200);
      const statsData = await statsRes.json();
      assert.strictEqual(statsData.stats.totalProducts >= 8, true);
      assert.strictEqual(statsData.stats.totalLots >= 8, true);

      // 404 Route
      const notFoundRes = await fetch(`${baseUrl}/api/ruta-inexistente`);
      assert.strictEqual(notFoundRes.status, 404);

    } finally {
      server.close();
    }
  });

  console.log(`\n====================================================`);
  console.log(`📊 RESULTADO DE PRUEBAS DEL MÓDULO 1:`);
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Error fatal durante la suite de pruebas:', err);
  process.exit(1);
});
