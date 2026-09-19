const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/db');

async function runAuthTests() {
  console.log('🧪 Iniciando batería de pruebas de seguridad y autenticación (Módulo 2)...\n');
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
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;

  try {
    // 1. Validación de campos requeridos
    await test('Rechaza login sin correo o sin contraseña (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gerencia@valetec.pe' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 2. Correo inexistente
    await test('Rechaza correo no registrado en la base de datos (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fantasma@valetec.pe', password: 'password123' })
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 3. Contraseña incorrecta
    await test('Rechaza contraseña incorrecta mediante hash bcrypt (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gerencia@valetec.pe', password: 'CLAVE_INCORRECTA' })
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.message.includes('Contraseña incorrecta'));
    });

    // 4. Usuario inactivo o en espera (Mariana Silva - status pending)
    await test('Bloquea colaborador con estado pendiente o inactivo (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mariana@valetec.pe', password: 'tech123' })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.message.includes('inactiva'));
    });

    // 5. Login exitoso con generación de JWT
    let adminToken = '';
    await test('Login exitoso de Gerente genera JWT criptográfico válido (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gerencia@valetec.pe', password: 'admin123' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.token && data.token.length > 20, 'Debe devolver un JWT');
      assert.strictEqual(data.user.roleKey, 'admin');
      adminToken = data.token;
    });

    // 6. Endpoint /me con token válido
    await test('Consulta de sesión propia en /api/auth/me con Bearer token (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.email, 'gerencia@valetec.pe');
      assert.strictEqual(data.user.name, 'Ing. Juan Pérez');
    });

    // 7. Acceso sin token
    await test('Rechaza peticiones protegidas sin encabezado de autorización (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 8. Token falso o manipulado
    await test('Rechaza token JWT falsificado o con firma inválida (401 Unauthorized)', async () => {
      const fakeToken = adminToken.substring(0, adminToken.length - 8) + 'FAKE1234';
      const res = await fetch(`${baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${fakeToken}` }
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 9. Login de Técnico para pruebas RBAC
    let techToken = '';
    await test('Login de Técnico de Mostrador genera credencial de técnico', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mostrador@valetec.pe', password: 'tech123' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.roleKey, 'tech');
      techToken = data.token;
    });

    // 10. Login de Química Regente para pruebas RBAC
    let qfToken = '';
    await test('Login de Química Regente genera credencial de Q.F.', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'regencia@valetec.pe', password: 'qf123' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.roleKey, 'qf');
      qfToken = data.token;
    });

    // 11. RBAC: Técnico intentando acceder a Gerencia -> Bloqueado
    await test('RBAC: Técnico bloqueado al intentar entrar a Gerencia (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/check-admin`, {
        headers: { 'Authorization': `Bearer ${techToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert(data.message.includes('Acceso denegado'));
    });

    // 12. RBAC: Dueño accediendo a Gerencia -> Permitido
    await test('RBAC: Dueño/Gerente autorizado para entrar a Gerencia (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/check-admin`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    // 13. RBAC: Química Regente autorizada para Regencia DIGEMID -> Permitido
    await test('RBAC: Química Regente autorizada en Regencia Sanitaria (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/check-regencia`, {
        headers: { 'Authorization': `Bearer ${qfToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    // 14. RBAC: Técnico bloqueado en Regencia Sanitaria -> Bloqueado
    await test('RBAC: Técnico bloqueado en Regencia Sanitaria (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/check-regencia`, {
        headers: { 'Authorization': `Bearer ${techToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

  } finally {
    server.close();
    await pool.end();
  }

  console.log(`\n====================================================`);
  console.log(`📊 RESULTADO DE PRUEBAS DE SEGURIDAD (MÓDULO 2):`);
  console.log(`   Superadas: ${passed}`);
  console.log(`   Fallidas:  ${failed}`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch(err => {
  console.error('Error fatal durante la prueba de autenticación:', err);
  process.exit(1);
});
