const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool, get } = require('../src/db');
const { seedDatabase } = require('../src/db/seed');

async function runCashTests() {
  console.log('🧪 Iniciando batería de pruebas de Control de Caja, Arqueo & Cierre Z (Módulo 4)...\n');
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
  const baseUrl = `http://127.0.0.1:${port}/api/cash`;
  const reportUrl = `http://127.0.0.1:${port}/api/reports`;

  try {
    // 1. Consulta de turno activo
    let activeShift = null;
    await test('Consulta de turno de caja activo en PostgreSQL (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/current`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.shift, 'Debe haber un turno activo');
      assert.strictEqual(data.data.shift.status, 'open');
      assert.strictEqual(typeof data.data.shift.expectedBalance, 'number');
      activeShift = data.data.shift;
    });

    // 2. Rechazo de egreso inválido
    await test('Rechaza registro de egreso sin monto o con monto negativo (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -10, concept: 'Gasto inválido' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 3. Registro de egreso autorizado y actualización de saldo esperado
    await test('Registra egreso en caja chica y deduce automáticamente saldo en gaveta (201 Created)', async () => {
      const expenseAmount = 45.00;
      const expectedBefore = activeShift.expectedBalance;

      const res = await fetch(`${baseUrl}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: expenseAmount,
          concept: 'Compra de bolsas farmacéuticas y papel térmico',
          responsible: 'Rodrigo Soto',
          type: 'egreso'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.amount, expenseAmount);
      assert.strictEqual(data.data.type, 'egreso');

      // Verificar en BD que expectedBalance disminuyó
      const updatedShift = await get('SELECT expected_balance, expenses FROM caja_turnos WHERE id = $1', [activeShift.id]);
      const expectedAfter = parseFloat(updatedShift.expected_balance);
      assert.strictEqual(Math.round((expectedBefore - expectedAfter) * 100) / 100, expenseAmount);
    });

    // 4. Arqueo físico y Cierre Z Oficial
    let zReport = null;
    await test('Ejecuta Cierre Z Oficial de Turno con auditoría de gaveta y cálculo de descuadre (200 OK)', async () => {
      // Obtenemos saldo esperado actual
      const shiftNow = await get('SELECT expected_balance FROM caja_turnos WHERE id = $1', [activeShift.id]);
      const currentExpected = parseFloat(shiftNow.expected_balance);

      // Simulamos conteo físico exacto
      const res = await fetch(`${baseUrl}/close-z`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedBalance: currentExpected,
          denominations: {
            bill100: 2,
            bill50: 1,
            bill20: 2,
            coin5: 3
          }
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.auditStatus, 'exacto');
      assert.strictEqual(data.data.difference, 0);
      assert.ok(data.data.closedAt);
      zReport = data.data;

      // Verificar que en PostgreSQL el estado pasó a closed_z
      const closedDb = await get('SELECT status, closed_at FROM caja_turnos WHERE id = $1', [activeShift.id]);
      assert.strictEqual(closedDb.status, 'closed_z');
      assert.ok(closedDb.closed_at !== null);
    });

    // 5. Rechaza ventas o movimientos en turno cerrado
    await test('Rechaza nuevo Cierre Z si el turno ya fue sellado (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/close-z`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedBalance: 500 })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 6. Apertura de nuevo turno de caja
    await test('Abre un nuevo turno de caja con fondo inicial en PostgreSQL (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingBalance: 300.00,
          terminal: 'Caja 01'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.status, 'open');
      assert.strictEqual(data.data.openingBalance, 300.00);
      assert.strictEqual(data.data.expectedBalance, 300.00);
    });

    // 7. Rechaza abrir dos turnos simultáneos
    await test('Bloquea apertura de un segundo turno si ya hay uno abierto (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance: 400.00 })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 8. Métricas consolidadas del Dashboard Gerencial
    await test('Consulta de métricas financieras y operativas para la Torre de Control (200 OK)', async () => {
      const res = await fetch(`${reportUrl}/dashboard`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.financials);
      assert.strictEqual(typeof data.data.financials.monthSales, 'number');
      assert.strictEqual(typeof data.data.financials.estimatedProfit, 'number');
      assert.ok(Array.isArray(data.data.topProducts));
      assert.ok(data.data.inventoryFefo);
    });

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DE PRUEBAS DE CAJA & REPORTES (MÓDULO 4):`);
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runCashTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error fatal en pruebas de caja:', err);
      process.exit(1);
    });
}

module.exports = { runCashTests };
