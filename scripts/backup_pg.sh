#!/usr/bin/env bash
# =============================================================
# VALETEC PHARMA - SCRIPT DE RESPALDO AUTOMATIZADO POSTGRESQL 16
# =============================================================
# Genera un volcado comprimido (.sql.gz) con marca de tiempo,
# verifica la integridad del archivo y rota respaldos antiguos.

set -euo pipefail

# Colores para salida de consola
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

# Configuración de variables con valores por defecto seguros
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-valetec_pharma_postgres}"
POSTGRES_USER="${PGUSER:-valetec_user}"
POSTGRES_DB="${PGDATABASE:-valetec_pharma}"
POSTGRES_HOST="${PGHOST:-localhost}"
POSTGRES_PORT="${PGPORT:-5434}"
RETENTION_DAYS="${RETENTION_DAYS:-15}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/valetec_pharma_backup_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  VALETEC PHARMA - Respaldo de Base de Datos         ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo -e "📅 Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "📦 Base de Datos: ${POSTGRES_DB}"
echo -e "👤 Usuario: ${POSTGRES_USER}"

# 1. Asegurar la existencia del directorio de respaldos
if [ ! -d "${BACKUP_DIR}" ]; then
  echo -e "${YELLOW}📁 Creando directorio de respaldos en: ${BACKUP_DIR}${NC}"
  mkdir -p "${BACKUP_DIR}"
fi

# 2. Ejecución del volcado con pg_dump
echo -e "${BLUE}⏳ Iniciando volcado y compresión gzip...${NC}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "🐳 Detectado contenedor Docker activo: ${CONTAINER_NAME}"
  docker exec -t "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"
elif command -v pg_dump &> /dev/null; then
  echo -e "💻 Ejecutando pg_dump en host local (${POSTGRES_HOST}:${POSTGRES_PORT})"
  PGPASSWORD="${PGPASSWORD:-valetec_secure_password_2026}" pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"
else
  echo -e "${RED}❌ ERROR: No se encontró el contenedor Docker '${CONTAINER_NAME}' ni el comando local 'pg_dump'.${NC}"
  exit 1
fi

# 3. Verificación de integridad del archivo generado
if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo -e "${GREEN}✅ Respaldo completado con éxito:${NC}"
  echo -e "   📂 Archivo: ${BACKUP_FILE}"
  echo -e "   📊 Tamaño: ${FILE_SIZE}"
else
  echo -e "${RED}❌ ERROR: El archivo de respaldo está vacío o falló la compresión.${NC}"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# 4. Rotación automática de respaldos antiguos (más de RETENTION_DAYS días)
echo -e "${BLUE}🧹 Verificando rotación de respaldos (retención: ${RETENTION_DAYS} días)...${NC}"
DELETED_COUNT=0
while IFS= read -r old_backup; do
  if [ -n "$old_backup" ]; then
    echo -e "${YELLOW}🗑️ Eliminando respaldo antiguo: ${old_backup}${NC}"
    rm -f "$old_backup"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -name "valetec_pharma_backup_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null || true)

if [ "$DELETED_COUNT" -eq 0 ]; then
  echo -e "✨ No hay respaldos que superen los ${RETENTION_DAYS} días de antigüedad."
else
  echo -e "${GREEN}✨ Rotación completada: ${DELETED_COUNT} archivos depurados.${NC}"
fi

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}  Operación de respaldo finalizada con éxito         ${NC}"
echo -e "${GREEN}=====================================================${NC}"
exit 0
