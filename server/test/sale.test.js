const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool, get } = require('../src/db');
const { seedDatabase } = require('../src/db/seed');

async function runSaleTests() {
  console.log('🧪 Iniciando batería de pruebas del Motor de Ventas & Deducción FEFO (Módulo 3)...\n');
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
  const baseUrl = `http://127.0.0.1:${port}/api/sales`;

  try {
    // 1. Rechazo de venta vacía
    await test('Rechaza venta sin medicamentos en el carrito (400 Bad Request)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 2. Venta exitosa con Correlativo B001 y Descuento FEFO
    let firstSale = null;
    let initialUnitsValetecDol = 0;

    await test('Emisión de Boleta B001 con deducción FEFO en PostgreSQL (201 Created)', async () => {
      // Consultar stock antes de la venta para Valetec-Dol (id: 1)
      const lotBefore = await get('SELECT stock_units, stock_blisters FROM lotes_fefo WHERE product_id = 1 ORDER BY expire_date ASC LIMIT 1');
      initialUnitsValetecDol = parseInt(lotBefore.stock_units, 10);
      const initialBlisters = parseInt(lotBefore.stock_blisters, 10);

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType: 'boleta',
          customerDoc: '44829102',
          customerName: 'MARIA LOPEZ',
          paymentMethod: 'cash',
          amountPaid: 50.00,
          items: [
            {
              productId: 1, // Valetec-Dol Forte 500mg
              fractionType: 'blister',
              quantity: 1, // 1 blíster = 10 pastillas
              unitPrice: 3.00
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.data.correlative.startsWith('B001-'), `Correlativo esperado B001-XXXX, recibido: ${data.data.correlative}`);
      assert.strictEqual(data.data.total, 3.00);
      assert.strictEqual(data.data.amountPaid, 50.00);
      assert.strictEqual(data.data.changeGiven, 47.00);
      firstSale = data.data;

      // Verificar que el lote se haya reducido exactamente en 10 pastillas y 1 blíster
      const lotAfter = await get('SELECT stock_units, stock_blisters FROM lotes_fefo WHERE product_id = 1 ORDER BY expire_date ASC LIMIT 1');
      assert.strictEqual(parseInt(lotAfter.stock_units, 10), initialUnitsValetecDol - 10, 'Las pastillas del lote no se descontaron correctamente');
      assert.strictEqual(parseInt(lotAfter.stock_blisters, 10), initialBlisters - 1, 'Los blísteres del lote no se descontaron correctamente');
    });

    // 3. Correlativo Consecutivo Ordenado
    await test('Genera numeración correlativa consecutiva estricta (B001-XXXX + 1)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType: 'boleta',
          customerDoc: '10293847',
          customerName: 'CARLOS GOMEZ',
          paymentMethod: 'yape',
          items: [
            {
              productId: 1,
              fractionType: 'unit',
              quantity: 2, // 2 pastillas
              unitPrice: 0.35
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.data.invoiceNumber, firstSale.invoiceNumber + 1, 'El correlativo debe incrementarse en +1');
    });

    // 4. Prueba de Rollback por Stock Insuficiente (ACID)
    await test('Rechaza venta por falta de stock y revierte transacción completa (Rollback ACID)', async () => {
      const countBefore = await get('SELECT COUNT(*) AS count FROM ventas');
      const lotBefore = await get('SELECT stock_units FROM lotes_fefo WHERE product_id = 1 ORDER BY expire_date ASC LIMIT 1');

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType: 'boleta',
          paymentMethod: 'cash',
          items: [
            {
              productId: 1,
              fractionType: 'box',
              quantity: 99999, // Imposible tener 99,999 cajas
              unitPrice: 28.00
            }
          ]
        })
      });

      // Debe ser rechazado
      assert.strictEqual(res.status >= 400, true);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.message.includes('Stock insuficiente'));

      // Verificar que NO se insertó ninguna venta y el stock NO se modificó
      const countAfter = await get('SELECT COUNT(*) AS count FROM ventas');
      const lotAfter = await get('SELECT stock_units FROM lotes_fefo WHERE product_id = 1 ORDER BY expire_date ASC LIMIT 1');

      assert.strictEqual(countBefore.count, countAfter.count, 'Se insertó una venta fantasma');
      assert.strictEqual(lotBefore.stock_units, lotAfter.stock_units, 'Se descontó stock de forma corrupta');
    });

    // 5. Impacto en Caja
    await test('Actualiza automáticamente el saldo esperado de la gaveta en PostgreSQL', async () => {
      const shiftBefore = await get("SELECT cash_sales, expected_balance FROM caja_turnos WHERE status = 'open' LIMIT 1");
      const cashBefore = parseFloat(shiftBefore.cash_sales);
      const expectedBefore = parseFloat(shiftBefore.expected_balance);

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType: 'ticket',
          paymentMethod: 'cash',
          amountPaid: 20.00,
          items: [
            {
              productId: 4, // Gastro-Bismut
              fractionType: 'unit',
              quantity: 10,
              unitPrice: 0.40 // Total: S/ 4.00
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.data.total, 4.00);

      const shiftAfter = await get("SELECT cash_sales, expected_balance FROM caja_turnos WHERE status = 'open' LIMIT 1");
      const cashAfter = parseFloat(shiftAfter.cash_sales);
      const expectedAfter = parseFloat(shiftAfter.expected_balance);

      assert.strictEqual(Math.round((cashAfter - cashBefore) * 100) / 100, 4.00);
      assert.strictEqual(Math.round((expectedAfter - expectedBefore) * 100) / 100, 4.00);
    });

    // 6. Desglose de IGV 18%
    await test('Cálculo exacto de Base Imponible y Desglose de IGV (18%)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType: 'factura',
          customerDoc: '20608920194',
          customerName: 'DROGUERIA Y DISTRIBUIDORA S.A.C.',
          paymentMethod: 'card',
          items: [
            {
              productId: 3, // Farma-Naprox (tiene 64 pastillas, 2 blíst. = 16 pastillas)
              fractionType: 'blister',
              quantity: 2,
              unitPrice: 59.00 // Total = 118.00
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.data.total, 118.00);
      assert.strictEqual(data.data.subtotal, 100.00, 'Subtotal debe ser 100.00 exactos');
      assert.strictEqual(data.data.igv, 18.00, 'IGV debe ser 18.00 exactos (18%)');
    });

    // 7. Consulta de Comprobante por ID con Partidas
    await test('Consulta de detalle de venta por ID para impresión térmica (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/${firstSale.saleId}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.correlative, firstSale.correlative);
      assert(data.data.items.length > 0);
      assert(data.data.items[0].lotNumber.length > 0);
    });

  } finally {
    server.close();
    await pool.end();
  }

  console.log(`\n====================================================`);
  console.log(`📊 RESULTADO DE PRUEBAS DE VENTAS & FEFO (MÓDULO 3):`);
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSaleTests().catch(err => {
  console.error('Error fatal durante la prueba de ventas:', err);
  process.exit(1);
});
