const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool, get } = require('../src/db');
const { seedDatabase } = require('../src/db/seed');

async function runRecipeTests() {
  console.log('🧪 Iniciando batería de pruebas del Libro Oficial DIGEMID & Recetas (Módulo 5)...\n');
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
  const baseUrl = `http://127.0.0.1:${port}/api/recipes`;

  try {
    // 1. Consulta inicial del libro oficial
    await test('Consulta del Libro Oficial de Recetas en PostgreSQL (200 OK)', async () => {
      const res = await fetch(baseUrl);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length >= 3);
    });

    // 2. Rechazo de receta incompleta
    await test('Rechaza foliación sin CMP de médico o sin DNI de paciente (400 Bad Request)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: 'Paciente Sin Documento',
          doctorName: 'Dr. Desconocido',
          medicationDetails: 'Antibiótico'
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 3. Foliación exitosa de nueva receta médica
    let createdFolio1 = null;
    await test('Folia correctamente una receta médica con correlativo REC-2026-XXXX en PostgreSQL (201 Created)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: 'Lucía Fernández Ramos',
          patientDni: '71928345',
          doctorName: 'Dr. Héctor Saldaña',
          doctorCmp: '49201',
          medicationDetails: 'Sedafarma 2mg (Clonazepam) - 1 caja x 30 unidades',
          notes: 'Paciente con insomnio severo. Custodia en caja fuerte.'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.folio.startsWith('REC-2026-'));
      assert.strictEqual(data.data.doctorCmp, 'CMP-49201');
      assert.strictEqual(data.data.status, 'retained');
      createdFolio1 = data.data.folio;
    });

    // 4. Foliación consecutiva estricta
    await test('Genera numeración correlativa estricta en el Libro Oficial (+1)', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: 'Andrés Morales Castro',
          patientDni: '40829103',
          doctorName: 'Dra. Patricia Quiroz',
          doctorCmp: 'CMP-61920',
          medicationDetails: 'Bio-Amoxil 500mg Cápsulas - 21 unidades',
          notes: 'Antibiótico de amplio espectro'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      const num1 = parseInt(createdFolio1.replace('REC-2026-', ''), 10);
      const num2 = parseInt(data.data.folio.replace('REC-2026-', ''), 10);
      assert.strictEqual(num2, num1 + 1);
    });

    // 5. Aprobación técnica por Química Farmacéutica
    await test('Aprobación técnica de receta por Química Regente (retained -> approved)', async () => {
      const res = await fetch(`${baseUrl}/${createdFolio1}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Comprobar en BD
      const row = await get('SELECT status FROM recetas_digemid WHERE folio = $1', [createdFolio1]);
      assert.strictEqual(row.status, 'approved');
    });

    // 6. Dispensación de receta en mostrador
    await test('Dispensación y descargo de receta médica en mostrador (approved -> dispensed)', async () => {
      const res = await fetch(`${baseUrl}/${createdFolio1}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dispensed' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Comprobar en BD
      const row = await get('SELECT status FROM recetas_digemid WHERE folio = $1', [createdFolio1]);
      assert.strictEqual(row.status, 'dispensed');
    });

    // 7. Rechazo de estado inválido
    await test('Rechaza transición a estado inexistente en normativa (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/${createdFolio1}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'eliminada' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 8. Reporte Oficial de Balance Sanitario DIGEMID
    await test('Genera reporte de Balance Sanitario oficial DIGEMID con inventario en caja fuerte (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/balance`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.establishment);
      assert.strictEqual(data.data.establishment.sanitaryLicense, 'DIRIS-LC N° 10842-FAR');
      assert.ok(data.data.summary);
      assert.ok(data.data.summary.totalLedgerEntries >= 5);
      assert.ok(data.data.vaultInventory);
      assert.ok(Array.isArray(data.data.records));
    });

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DE PRUEBAS DIGEMID & RECETAS (MÓDULO 5):`);
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runRecipeTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error fatal en pruebas de recetas DIGEMID:', err);
      process.exit(1);
    });
}

module.exports = { runRecipeTests };
