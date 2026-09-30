/**
 * ============================================================================
 * VALETEC PHARMA - SCRIPT MULTIPLATAFORMA DE RESPALDO (BACKUP POSTGRESQL 16)
 * ============================================================================
 * Compatible con Windows, Linux y macOS.
 * Genera volcados comprimidos (.sql.gz), calcula tamaños y aplica rotación
 * automática según política de retención (RETENTION_DAYS).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn, execSync } = require('child_process');

// 1. Cargar variables de entorno del servidor (Parser nativo sin dependencias externas)
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const config = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || process.env.BD_PUERTO || 5442,
  user: process.env.PGUSER || 'valetec_user',
  password: process.env.PGPASSWORD || 'valetec_secure_password_2026',
  database: process.env.PGDATABASE || 'valetec_pharma',
  containerName: process.env.CONTAINER_NAME || 'valetec_pharma_postgres',
  backupDir: path.resolve(rootDir, process.env.BACKUP_DIR || 'backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '15', 10)
};

// Formato de fecha para nombres de archivo: YYYYMMDD_HHMMSS
function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Formato legible de tamaño de archivo
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Listar respaldos existentes
function listBackups() {
  if (!fs.existsSync(config.backupDir)) {
    console.log('No existe el directorio de respaldos.');
    return;
  }
  const files = fs.readdirSync(config.backupDir)
    .filter(f => f.startsWith('valetec_pharma_backup_') && f.endsWith('.sql.gz'))
    .map(f => {
      const fullPath = path.join(config.backupDir, f);
      const stat = fs.statSync(fullPath);
      return { file: f, size: formatBytes(stat.size), mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  console.log('\n📦 Respaldos disponibles en:', config.backupDir);
  console.log('------------------------------------------------------------');
  if (files.length === 0) {
    console.log('No hay archivos de respaldo aún.');
  } else {
    files.forEach((b, idx) => {
      console.log(`[${idx + 1}] ${b.file} (${b.size}) - ${b.mtime.toLocaleString()}`);
    });
  }
  console.log('------------------------------------------------------------\n');
}

// Rotación automática de respaldos antiguos
function rotateBackups() {
  if (!fs.existsSync(config.backupDir)) return;

  const now = Date.now();
  const maxAgeMs = config.retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(config.backupDir).filter(f => f.startsWith('valetec_pharma_backup_'));

  let deleted = 0;
  files.forEach(file => {
    const filePath = path.join(config.backupDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtime.getTime() > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Depurado por antigüedad (> ${config.retentionDays} días): ${file}`);
        deleted++;
      }
    } catch (err) {
      console.warn(`No se pudo verificar rotación para ${file}:`, err.message);
    }
  });

  if (deleted > 0) {
    console.log(`✨ Rotación finalizada: ${deleted} respaldo(s) antiguo(s) eliminados.`);
  } else {
    console.log(`✨ Rotación: todos los respaldos están dentro del período de retención (${config.retentionDays} días).`);
  }
}

// Buscar ejecutable pg_dump en el sistema
function findPgDumpCommand() {
  if (process.env.PG_DUMP_PATH && fs.existsSync(process.env.PG_DUMP_PATH)) {
    return process.env.PG_DUMP_PATH;
  }
  try {
    execSync(process.platform === 'win32' ? 'where pg_dump' : 'which pg_dump', { stdio: 'ignore' });
    return 'pg_dump';
  } catch (e) {}

  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe'
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return 'pg_dump';
}

// Ejecución del respaldo principal
async function runBackup() {
  console.log('=====================================================');
  console.log('  VALETEC PHARMA - SISTEMA AUTOMÁTICO DE RESPALDO    ');
  console.log('=====================================================');
  console.log(`📅 Fecha/Hora: ${new Date().toLocaleString()}`);
  console.log(`📦 Base de Datos: ${config.database}`);
  console.log(`👤 Usuario DB: ${config.user}`);

  // Asegurar directorio destino
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`📁 Carpeta creada: ${config.backupDir}`);
  }

  const timestamp = getFormattedTimestamp();
  const backupFileName = `valetec_pharma_backup_${timestamp}.sql.gz`;
  const backupFilePath = path.join(config.backupDir, backupFileName);

  // Verificar si Docker tiene el contenedor activo
  let useDocker = false;
  try {
    const runningContainers = execSync('docker ps --format "{{.Names}}"', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    if (runningContainers.split('\n').some(name => name.trim() === config.containerName)) {
      useDocker = true;
    }
  } catch (e) {
    useDocker = false;
  }

  let child;
  if (useDocker) {
    console.log(`🐳 Contenedor Docker detectado: '${config.containerName}'. Ejecutando pg_dump interno...`);
    const args = [
      'exec',
      '-i',
      config.containerName,
      'pg_dump',
      '-U', config.user,
      '-d', config.database,
      '--clean',
      '--if-exists'
    ];
    child = spawn('docker', args);
  } else {
    const pgDumpBin = findPgDumpCommand();
    console.log(`💻 Conectando a PostgreSQL local (${config.host}:${config.port}) usando: ${pgDumpBin}...`);
    const env = { ...process.env, PGPASSWORD: config.password };
    const args = [
      '-h', String(config.host),
      '-p', String(config.port),
      '-U', config.user,
      '-d', config.database,
      '--clean',
      '--if-exists'
    ];
    child = spawn(pgDumpBin, args, { env });
  }

  const gzip = zlib.createGzip({ level: 9 });
  const outputStream = fs.createWriteStream(backupFilePath);

  let stderrOutput = '';
  if (child.stderr) {
    child.stderr.on('data', chunk => {
      stderrOutput += chunk.toString();
    });
  }

  child.on('error', err => {
    console.error('❌ Error al iniciar el proceso de volcado:', err.message);
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
    process.exit(1);
  });

  child.stdout.pipe(gzip).pipe(outputStream);

  outputStream.on('finish', () => {
    const stats = fs.statSync(backupFilePath);
    if (stats.size < 100) {
      console.error('❌ Error: El archivo de volcado está vacío o falló la conexión con PostgreSQL.');
      if (stderrOutput) console.error('Detalles:', stderrOutput);
      fs.unlinkSync(backupFilePath);
      process.exit(1);
    }

    console.log('✅ Respaldo generado y comprimido con éxito:');
    console.log(`   📂 Archivo: ${backupFileName}`);
    console.log(`   📊 Tamaño: ${formatBytes(stats.size)}`);
    console.log(`   📍 Ruta: ${backupFilePath}`);

    // Ejecutar rotación
    rotateBackups();
    console.log('=====================================================\n');
  });

  outputStream.on('error', err => {
    console.error('❌ Error escribiendo archivo de respaldo:', err.message);
    if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
    process.exit(1);
  });
}

// Punto de entrada CLI
const arg = process.argv[2];
if (arg === '--list') {
  listBackups();
} else {
  runBackup();
}
