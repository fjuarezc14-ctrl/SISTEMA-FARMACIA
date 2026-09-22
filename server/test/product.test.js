const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool, get } = require('../src/db');
const { seedDatabase } = require('../src/db/seed');

async function runProductTests() {
  console.log('🧪 Iniciando batería de pruebas del Catálogo Maestro de Medicamentos (Fase A - Módulo 1)...\n');
  await seedDatabase();
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

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/products`;

  try {
    // 1. Consulta del catálogo
    await test('Consulta del catálogo maestro de productos con registro sanitario y estado (200 OK)', async () => {
      const res = await fetch(baseUrl);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length >= 6);
      assert.ok('sanitaryRegistry' in data.data[0]);
      assert.ok('status' in data.data[0]);
    });

    // 2. Rechazo de fármaco sin campos obligatorios
    await test('Rechaza creación sin nombre, DCI o precios (400 Bad Request)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laboratory: 'Bayer'
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 3. Creación exitosa de nuevo medicamento
    let newProdId = null;
    const testBarcode = `775${Date.now().toString().slice(-9)}`;
    await test('Alta de nuevo medicamento con fraccionamiento y lote FEFO inicial (201 Created)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: testBarcode,
          name: 'Azitromicina 500mg Forte',
          genericDci: 'Azitromicina',
          laboratory: 'Genfar',
          categoryId: 2,
          location: 'Pasillo 1 • Anaquel C-2',
          boxPrice: 36.00,
          blisterPrice: 12.50,
          unitPrice: 4.50,
          unitsPerBox: 30,
          unitsPerBlister: 3,
          prescriptionType: 'required',
          sanitaryRegistry: 'NG-11223',
          initialBoxes: 10,
          lotNumber: 'L-AZI99',
          expireDate: '2028-06-30'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.name, 'Azitromicina 500mg Forte');
      newProdId = data.data.id;
      assert.ok(newProdId > 0);
    });

    // 4. Rechazo de código de barras duplicado
    await test('Rechaza creación con código de barras duplicado (409 Conflict)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: testBarcode,
          name: 'Intento de Copia',
          genericDci: 'Azitromicina',
          laboratory: 'Otro Lab',
          categoryId: 2,
          boxPrice: 30.00,
          blisterPrice: 10.00,
          unitPrice: 3.50
        })
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('ya está asignado'));
    });

    // 5. Edición de precios y ubicación
    await test('Modificación de datos maestros y precios de medicamento existente (200 OK)', async () => {
      assert.ok(newProdId);
      const res = await fetch(`${baseUrl}/${newProdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxPrice: 39.90,
          location: 'Pasillo 2 • Anaquel A-1'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(parseFloat(data.data.box_price), 39.90);
      assert.strictEqual(data.data.location, 'Pasillo 2 • Anaquel A-1');
    });

    // 6. Cambio de estado Activo/Inactivo
    await test('Alternancia de estado de producto entre Activo e Inactivo (200 OK)', async () => {
      assert.ok(newProdId);
      const res = await fetch(`${baseUrl}/${newProdId}/toggle`, {
        method: 'PATCH'
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, 'inactive');
    });

  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log('📊 RESULTADO DE PRUEBAS DEL CATÁLOGO (MÓDULO 1):');
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runProductTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runProductTests };
