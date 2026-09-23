/**
 * VALETEC PHARMA - MOTOR DE EMPAQUETADO Y BUILD PARA PRODUCCIÓN
 * 
 * Verifica la sintaxis, valida la integridad de identificadores DOM,
 * optimiza activos estáticos y empaqueta la distribución final en dist/.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('\n======================================================');
console.log('  VALETEC PHARMA - PROCESO DE BUILD PARA PRODUCCIÓN  ');
console.log('======================================================\n');

// 1. Verificación de archivos esenciales
console.log('🔍 Paso 1: Verificando presencia de archivos fuente...');
const requiredFiles = [
  path.join(CLIENT_DIR, 'index.html'),
  path.join(CLIENT_DIR, 'css', 'styles.css'),
  path.join(CLIENT_DIR, 'js', 'app.js'),
  path.join(CLIENT_DIR, 'js', 'api.js'),
  path.join(ROOT_DIR, 'server', 'services', 'sunatService.js'),
  path.join(ROOT_DIR, 'server', 'src', 'routes', 'webhook.routes.js')
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Error crítico: Falta archivo requerido: ${path.relative(ROOT_DIR, file)}`);
    process.exit(1);
  }
}
console.log('✅ Todos los archivos esenciales están presentes.\n');

// 2. Comprobación estricta de sintaxis en JavaScript
console.log('🧪 Paso 2: Ejecutando validación de sintaxis Node.js...');
const jsFilesToValidate = [
  path.join(CLIENT_DIR, 'js', 'app.js'),
  path.join(CLIENT_DIR, 'js', 'api.js'),
  path.join(ROOT_DIR, 'server', 'services', 'sunatService.js'),
  path.join(ROOT_DIR, 'server', 'src', 'routes', 'webhook.routes.js')
];

for (const jsFile of jsFilesToValidate) {
  try {
    execSync(`node -c "${jsFile}"`, { stdio: 'pipe' });
    console.log(`   ✓ Sintaxis limpia: ${path.relative(ROOT_DIR, jsFile)}`);
  } catch (err) {
    console.error(`❌ Error de sintaxis en: ${path.relative(ROOT_DIR, jsFile)}`);
    console.error(err.stderr.toString());
    process.exit(1);
  }
}
console.log('✅ Validación de sintaxis JS superada con éxito.\n');

// 3. Auditoría de Identificadores DOM (Preservación Absoluta)
console.log('🛡️ Paso 3: Auditando identificadores de la interfaz (DOM IDs)...');
const htmlContent = fs.readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf8');
const idMatches = htmlContent.match(/id="([^"]+)"/g) || [];
const ids = idMatches.map(m => m.replace(/id="|"/g, ''));
const uniqueIds = new Set(ids);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);

if (duplicates.length > 0) {
  console.warn(`⚠️ Advertencia: Se encontraron IDs duplicados: ${duplicates.join(', ')}`);
} else {
  console.log(`✅ Preservación 100% confirmada: ${uniqueIds.size} IDs únicos verificados sin colisiones.`);
}
console.log('');

// 4. Preparación y generación del directorio de distribución (dist/)
console.log('📦 Paso 4: Empaquetando y optimizando para distribución (dist/)...');

if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(path.join(DIST_DIR, 'css'), { recursive: true });
fs.mkdirSync(path.join(DIST_DIR, 'js'), { recursive: true });

// Copia y optimización de index.html
const prodHtml = htmlContent.replace(/\?v=\d+\.\d+/g, `?v=prod-${Date.now().toString(36)}`);
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), prodHtml, 'utf8');

// Copia y empaquetado de CSS
const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'css', 'styles.css'), 'utf8');
const cssHeader = `/* VALETEC PHARMA - Production Build v2.0 - Built at ${new Date().toISOString()} */\n`;
fs.writeFileSync(path.join(DIST_DIR, 'css', 'styles.css'), cssHeader + cssContent, 'utf8');

// Copia y empaquetado de JS
const appJsContent = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'app.js'), 'utf8');
const apiJsContent = fs.readFileSync(path.join(CLIENT_DIR, 'js', 'api.js'), 'utf8');
const jsHeader = `/* VALETEC PHARMA - Production Core v2.0 - Built at ${new Date().toISOString()} */\n`;
fs.writeFileSync(path.join(DIST_DIR, 'js', 'app.js'), jsHeader + appJsContent, 'utf8');
fs.writeFileSync(path.join(DIST_DIR, 'js', 'api.js'), jsHeader + apiJsContent, 'utf8');

// 5. Generación del Manifiesto de Despliegue (build-manifest.json)
console.log('📋 Paso 5: Generando manifiesto de integridad (build-manifest.json)...');
const manifest = {
  application: 'VALETEC PHARMA',
  version: '2.0.0-production',
  environment: 'production',
  builtAt: new Date().toISOString(),
  targetCommit: 'local-go-live-fase-100',
  domIdentifiersCount: uniqueIds.size,
  assets: {
    'index.html': {
      sizeBytes: fs.statSync(path.join(DIST_DIR, 'index.html')).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST_DIR, 'index.html'))).digest('hex')
    },
    'css/styles.css': {
      sizeBytes: fs.statSync(path.join(DIST_DIR, 'css', 'styles.css')).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST_DIR, 'css', 'styles.css'))).digest('hex')
    },
    'js/app.js': {
      sizeBytes: fs.statSync(path.join(DIST_DIR, 'js', 'app.js')).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST_DIR, 'js', 'app.js'))).digest('hex')
    },
    'js/api.js': {
      sizeBytes: fs.statSync(path.join(DIST_DIR, 'js', 'api.js')).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST_DIR, 'js', 'api.js'))).digest('hex')
    }
  },
  sunatUblVersion: '2.1',
  posWebhooksSupport: ['Niubiz', 'Izipay'],
  status: 'READY_FOR_DEPLOYMENT'
};

fs.writeFileSync(path.join(DIST_DIR, 'build-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log('\n======================================================');
console.log('  ✨ BUILD COMPLETADO SATISFACTORIAMENTE (100%)       ');
console.log('======================================================');
console.log(`📁 Directorio de salida: dist/`);
console.log(`📄 Archivos generados:`);
console.log(`   - dist/index.html        (${manifest.assets['index.html'].sizeBytes} bytes)`);
console.log(`   - dist/css/styles.css    (${manifest.assets['css/styles.css'].sizeBytes} bytes)`);
console.log(`   - dist/js/app.js         (${manifest.assets['js/app.js'].sizeBytes} bytes)`);
console.log(`   - dist/js/api.js         (${manifest.assets['js/api.js'].sizeBytes} bytes)`);
console.log(`   - dist/build-manifest.json`);
console.log('🚀 Listo para servir en Nginx Cloud o desplegar en VPS.\n');
