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

  const jwt = require('jsonwebtoken');
  const config = require('../src/config/env');
  const testToken = jwt.sign(
    { id: 1, name: 'Admin Test', roleKey: 'admin', roleLabel: 'Administrador' },
    config.jwtSecret,
    { expiresIn: '2h' }
  );
  const _fetch = global.fetch;
  const fetch = (url, options = {}) => {
    const headers = {
      'Authorization': `Bearer ${testToken}`,
      ...(options.headers || {})
    };
    return _fetch(url, { ...options, headers });
  };

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

    // 7. Caso Borde: Descomposición matemática exacta de fraccionamiento jerárquico
    const fracBarcode = `775${Date.now().toString().slice(-8)}F`;
    let fracProdId = null;
    await test('Caso Borde: Descomposición matemática de fraccionamiento jerárquico (Cajas, Blísters sueltos, Pastillas)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: fracBarcode,
          name: 'Amoxicilina 500mg Test Frac',
          genericDci: 'Amoxicilina',
          laboratory: 'Farmatec',
          categoryId: 2,
          boxPrice: 50.00,
          blisterPrice: 6.00,
          unitPrice: 0.80,
          unitsPerBox: 100,
          unitsPerBlister: 10,
          initialUnits: 145,
          lotNumber: 'L-FRAC145',
          expireDate: '2028-12-31'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      fracProdId = data.data.id;

      // Consultar en el catálogo para verificar el fraccionamiento normalizado
      const listRes = await fetch(`${baseUrl}?search=${encodeURIComponent('Amoxicilina 500mg Test Frac')}`);
      const listData = await listRes.json();
      const item = listData.data.find(p => p.id === fracProdId);
      assert.ok(item, 'Producto con fraccionamiento debe existir en catálogo');

      // Validaciones matemáticas estrictas:
      // 145 unidades con empaque 100/10 -> 1 caja cerrada, 4 blísters sueltos, 5 pastillas sueltas
      assert.strictEqual(item.stockBoxes, 1, 'Debe haber exactamente 1 caja cerrada');
      assert.strictEqual(item.stockBlisters, 4, 'Debe haber exactamente 4 blísters sueltos remanentes (no 14)');
      assert.strictEqual(item.looseUnits, 5, 'Debe haber exactamente 5 pastillas sueltas');
      assert.strictEqual(item.stockUnits, 145, 'El total debe ser 145 unidades');
      assert.strictEqual(
        (item.stockBoxes * 100) + (item.stockBlisters * 10) + item.looseUnits,
        item.stockUnits,
        'La ecuación de balance físico debe ser exacta sin duplicar stock'
      );
    });

    // 8. Caso Borde: Producto unitario puro (sin fraccionamiento uBox = 1, uBlister = 1)
    await test('Caso Borde: Producto unitario puro sin fraccionamiento (jarabes/cremas uBox=1)', async () => {
      const jarabeBarcode = `775${Date.now().toString().slice(-8)}J`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: jarabeBarcode,
          name: 'Jarabe Tos Infantil 120ml',
          genericDci: 'Dextrometorfano',
          laboratory: 'Farmatec',
          categoryId: 1,
          unitPrice: 18.50,
          unitsPerBox: 1,
          unitsPerBlister: 1,
          initialUnits: 15,
          lotNumber: 'L-JAR15',
          expireDate: '2028-09-30'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      const listRes = await fetch(`${baseUrl}?search=${encodeURIComponent('Jarabe Tos Infantil 120ml')}`);
      const listData = await listRes.json();
      const item = listData.data.find(p => p.id === data.data.id);
      assert.ok(item);
      assert.strictEqual(item.stockBoxes, 15);
      assert.strictEqual(item.stockBlisters, 0, 'No debe haber blísters en productos unitarios');
      assert.strictEqual(item.looseUnits, 0, 'No debe haber pastillas sueltas');
      assert.strictEqual(item.stockUnits, 15);
    });

    // 9. Caso Borde: Trazabilidad y consistencia de unidad en Kardex para nuevo lote
    await test('Caso Borde: Trazabilidad y consistencia de unidad (unit) en Kardex para nuevo lote', async () => {
      assert.ok(fracProdId);
      const ProductModel = require('../src/models/product.model');
      await ProductModel.createLotWithKardex(fracProdId, {
        lotNumber: 'L-EXTRA50',
        expireDate: '2029-01-31',
        stockBoxes: 0,
        stockBlisters: 0,
        stockUnits: 50
      });

      const kardexRows = await pool.query(
        'SELECT * FROM kardex WHERE product_id = $1 AND reference_type = $2 ORDER BY id DESC LIMIT 1',
        [fracProdId, 'LOTE_NUEVO']
      );
      assert.strictEqual(kardexRows.rows.length, 1);
      assert.strictEqual(kardexRows.rows[0].unit_type, 'unit', 'El Kardex debe registrar unit_type como unit');
      assert.strictEqual(parseInt(kardexRows.rows[0].quantity, 10), 50, 'La cantidad debe ser 50 unidades');
    });

    // 10. Caso Borde: Producto con stock cero o sin existencias
    await test('Caso Borde: Producto con stock cero (0 un.) no genera NaN ni divisiones inválidas', async () => {
      const zeroBarcode = `775${Date.now().toString().slice(-8)}Z`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: zeroBarcode,
          name: 'Ibuprofeno 400mg Stock Cero',
          genericDci: 'Ibuprofeno',
          laboratory: 'Farmatec',
          categoryId: 1,
          boxPrice: 20.00,
          blisterPrice: 2.50,
          unitPrice: 0.30,
          unitsPerBox: 100,
          unitsPerBlister: 10
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      const listRes = await fetch(`${baseUrl}?search=${encodeURIComponent('Ibuprofeno 400mg Stock Cero')}`);
      const listData = await listRes.json();
      const item = listData.data.find(p => p.id === data.data.id);
      assert.ok(item);
      assert.strictEqual(item.stockBoxes, 0);
      assert.strictEqual(item.stockBlisters, 0);
      assert.strictEqual(item.looseUnits, 0);
      assert.strictEqual(item.stockUnits, 0);
    });

    // 11. Caso Borde: Múltiples lotes FEFO con descomposición jerárquica individual por lote
    await test('Caso Borde: Múltiples lotes FEFO mantienen trazabilidad jerárquica por lote en findById', async () => {
      assert.ok(fracProdId);
      const ProductModel = require('../src/models/product.model');
      const detail = await ProductModel.findById(fracProdId);
      assert.ok(detail);
      assert.ok(Array.isArray(detail.lots));
      assert.ok(detail.lots.length >= 2, 'Debe registrar los 2 lotes creados');

      // Validar que cada lote tenga su desglose físico correcto
      detail.lots.forEach(l => {
        assert.ok(typeof l.stockBoxes === 'number', 'stockBoxes debe ser número');
        assert.ok(typeof l.stockBlisters === 'number', 'stockBlisters debe ser número');
        assert.ok(typeof l.looseUnits === 'number', 'looseUnits debe ser número');
        assert.ok(typeof l.stockUnits === 'number', 'stockUnits debe ser número');
        assert.strictEqual(
          (l.stockBoxes * 100) + (l.stockBlisters * 10) + l.looseUnits,
          l.stockUnits,
          'Balance físico individual de cada lote debe ser matemáticamente consistente'
        );
      });
    });

    // 12. Caso Borde: Merma fraccionada en pastillas sueltas con trazabilidad en Kardex
    await test('Caso Borde: Ajuste de merma en pastillas sueltas actualiza stock y registra en Kardex', async () => {
      assert.ok(fracProdId);
      const ProductModel = require('../src/models/product.model');
      const adjResult = await ProductModel.adjustStock({
        productId: fracProdId,
        lotId: 'auto',
        adjustmentType: 'loss',
        quantity: 15,
        unitType: 'unit',
        reason: 'Frasco con 15 pastillas quebradas en transporte',
        userName: 'Tech Lead QF'
      });
      assert.ok(adjResult);
      assert.strictEqual(adjResult.unitsAdjusted, 15);

      const kRes = await pool.query(
        'SELECT * FROM kardex WHERE product_id = $1 AND movement_type = $2 ORDER BY id DESC LIMIT 1',
        [fracProdId, 'loss']
      );
      assert.strictEqual(kRes.rows.length, 1);
      assert.strictEqual(parseInt(kRes.rows[0].quantity, 10), -15);
      assert.strictEqual(kRes.rows[0].unit_type, 'unit');
      assert.strictEqual(kRes.rows[0].reason, 'Frasco con 15 pastillas quebradas en transporte');
      assert.strictEqual(kRes.rows[0].user_name, 'Tech Lead QF');
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
