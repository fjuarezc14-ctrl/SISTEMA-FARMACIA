# VALETEC PHARMA SUITE v2.0 - DEVOPS & CONTINGENCIAS
**Módulo:** Guía de Despliegue, Políticas de Respaldo, Plan de Continuidad y Troubleshooting  
**Audiencia:** Administradores de Sistemas, Ingenieros DevOps y Soporte de Infraestructura TI  
**Entorno Operativo:** Docker Engine 24+ / Docker Compose v2 / Linux (Ubuntu/Debian) / Windows Server  

---

## 1. Puesta en Marcha Rápida (Quickstart de Producción)

### 1.1 Requisitos Mínimos de Servidor
* **CPU:** 2 núcleos (vCPU)
* **Memoria RAM:** 2 GB mínimo (La suite optimizada consume ~140 MiB en reposo y < 350 MiB con tráfico)
* **Disco:** 20 GB de almacenamiento SSD (recomendado para crecimiento de base de datos y respaldos)
* **Software:** Docker Engine versión 24.0+ y Docker Compose v2.20+

### 1.2 Configuración del Archivo de Entorno (`.env`)
En el servidor de producción, cree el archivo `.env` en la raíz del repositorio basándose en `.env.example`:

```bash
cp .env.example .env
chmod 600 .env
```

Asegúrese de establecer valores de producción seguros:

```ini
# ========================================================
# VALETEC PHARMA - CONFIGURACIÓN DE PRODUCCIÓN
# ========================================================
NODE_ENV=production
PUERTO=4030
FRONTEND_PUERTO=5186

# Base de Datos PostgreSQL 16
PGHOST=valetec-db
PGPORT=5432
PGUSER=valetec_admin_prod
PGPASSWORD=TuClaveSuperSeguraDeProduccion2026!
PGDATABASE=valetec_pharma
BD_PUERTO=5442

# Seguridad Criptográfica y Tokens
JWT_SECRET=clave_secreta_jwt_produccion_sha256_valetec_2026_xyz
POS_WEBHOOK_SECRET=token_secreto_pos_niubiz_izipay_2026_prod

# Parámetros del Servicio de Respaldo
BACKUP_SCHEDULE=0 3 * * *
BACKUP_RETENTION_DAYS=15
```

---

### 1.3 Despliegue con Docker Compose
Ejecute la compilación y puesta en marcha en segundo plano:

```bash
# 1. Descargar la versión más reciente de la rama principal
git pull origin main

# 2. Construir imágenes e iniciar los 4 micro-servicios
docker compose up -d --build

# 3. Comprobar que los servicios estén activos y saludables
docker compose ps
```

**Salida esperada:**
```text
NAME                     IMAGE                      COMMAND                  SERVICE            STATUS
valetec_pharma_postgres  postgres:16-alpine         "docker-entrypoint.s…"   valetec-db         Up (healthy)
valetec_pharma_backend   sistema-farmacia-backend   "node index.js"          valetec-backend    Up
valetec_pharma_frontend  sistema-farmacia-frontend  "/docker-entrypoint.…"   valetec-frontend   Up
valetec_pharma_backup    alpine:3.19                "/bin/sh -c 'crond -…"   valetec-backup     Up
```

---

## 2. Monitoreo y Mantenimiento Diario

### 2.1 Verificación de Logs en Tiempo Real
Para diagnosticar cualquier eventualidad, revise los registros del contenedor específico:

```bash
# Logs del backend Express
docker compose logs -f --tail=100 valetec-backend

# Logs del servidor Nginx (accesos y peticiones web)
docker compose logs -f --tail=50 valetec-frontend

# Logs de la base de datos PostgreSQL
docker compose logs -f --tail=50 valetec-db
```

### 2.2 Consumo de Recursos en Producción
Supervise el uso de memoria y procesador de los contenedores:
```bash
docker stats --no-stream
```

---

## 3. Políticas de Respaldo y Recuperación ante Desastres (Disaster Recovery)

### 3.1 Política de Copias de Seguridad
1. **Respaldo Automático Diario:** El contenedor `valetec-backup` se activa a las **03:00 AM** todos los días.
2. **Formato:** Archivos `.sql.gz` comprimidos con marca de tiempo ISO (ej. `valetec_pharma_backup_20261005_030000.sql.gz`).
3. **Rotación:** Se purgan automáticamente las copias que superen los **15 días** para no saturar el almacenamiento.
4. **Ubicación:** Los respaldos se guardan en el volumen local `./backups`.

### 3.2 Generación de Respaldo Manual Bajo Demanda
Antes de aplicar actualizaciones en el servidor o mantenimientos mayores:

* **Opción A (Script Bash en Linux):**
  ```bash
  chmod +x ./scripts/backup_pg.sh
  ./scripts/backup_pg.sh
  ```
* **Opción B (Script PowerShell en Windows):**
  ```powershell
  .\scripts\backup_pg.ps1
  ```
* **Opción C (Comando directo por Docker):**
  ```bash
  docker exec -t valetec_pharma_postgres pg_dump -U valetec_user valetec_pharma | gzip > ./backups/respaldo_manual_$(date +%Y%m%d_%H%M%S).sql.gz
  ```

---

### 3.3 Procedimiento de Restauración Paso a Paso (Disaster Recovery)
Si ocurre una pérdida de datos o se migra el sistema a un nuevo servidor:

#### Paso 1: Asegurar que el contenedor de base de datos esté corriendo
```bash
docker compose up -d valetec-db
```

#### Paso 2: Descomprimir el archivo de respaldo seleccionado
```bash
gunzip -k ./backups/valetec_pharma_backup_20261005_030000.sql.gz
```

#### Paso 3: Inyectar el volcado SQL en PostgreSQL
```bash
# Restaurar la estructura y los datos
docker exec -i valetec_pharma_postgres psql -U valetec_user -d valetec_pharma < ./backups/valetec_pharma_backup_20261005_030000.sql
```

#### Paso 4: Validar la integridad de los datos
Conéctese brevemente a la base de datos para verificar que las tablas principales contengan registros:
```bash
docker exec -it valetec_pharma_postgres psql -U valetec_user -d valetec_pharma -c "SELECT COUNT(*) AS total_productos FROM productos; SELECT COUNT(*) AS total_ventas FROM ventas;"
```

#### Paso 5: Reiniciar el backend para refrescar conexiones
```bash
docker compose restart valetec-backend
```

---

## 4. Matriz de Resolución de Incidentes (Troubleshooting)

### Caso 1: Error "port is already allocated" o conflicto de puertos
* **Síntoma:** Al levantar Docker Compose, sale un error similar a:
  `Error response from daemon: driver failed programming external connectivity on endpoint: Bind for 0.0.0.0:5186 failed: port is already allocated`
* **Causa:** Otro servicio en el servidor host está utilizando el puerto configurado.
* **Solución:**
  1. Identifique el proceso en conflicto:
     * Linux: `sudo lsof -i :5186` o `sudo netstat -tulpn | grep 5186`
     * Windows: `netstat -ano | findstr :5186`
  2. Modifique el puerto en su archivo `.env` (ej. cambiar `FRONTEND_PUERTO=5187` o `PUERTO=4035`).
  3. Ejecute `docker compose up -d`.

---

### Caso 2: El Backend no conecta con la Base de Datos (`ECONNREFUSED`)
* **Síntoma:** Los logs del backend muestran `getaddrinfo ENOTFOUND valetec-db` o `connect ECONNREFUSED`.
* **Causa:** La base de datos aún no ha superado el healthcheck o el contenedor cayó.
* **Solución:**
  1. Verifique el estado del contenedor de BD: `docker compose ps valetec-db`.
  2. Si está en estado `unhealthy`, revise los logs de Postgres: `docker compose logs valetec-db`.
  3. Verifique que el nombre de host en el `.env` sea estrictamente `PGHOST=valetec-db` (el nombre del servicio interno en Docker, NO localhost ni 127.0.0.1).

---

### Caso 3: Nginx devuelve "502 Bad Gateway"
* **Síntoma:** Al cargar la aplicación en el navegador, aparece el error 502 de Nginx.
* **Causa:** El contenedor `valetec-frontend` está activo, pero el servicio `valetec-backend` está detenido o reiniciándose.
* **Solución:**
  1. Inspeccione el estado del backend: `docker compose logs -f valetec-backend`.
  2. Si el proceso falló por un error de sintaxis o variable no declarada, corrija la variable en `.env` y reinicie:
     ```bash
     docker compose restart valetec-backend
     ```

---

### Caso 4: Caída de Conectividad con SUNAT (Comprobantes en estado `pending`)
* **Síntoma:** Las boletas o facturas se emiten correctamente en mostrador, pero el estado de SUNAT figura en `pending`.
* **Causa:** El servidor web de SUNAT presenta intermitencias o el establecimiento perdió conexión a internet temporalmente.
* **Comportamiento del Sistema:**
  * **No bloquea la atención:** El sistema permite que el cliente reciba su ticket físico de contingencia.
  * Los comprobantes quedan en cola local con su XML y hash generados.
* **Solución Operativa:**
  1. Cuando la conexión se restablezca, el Administrador o Químico Farmacéutico debe ingresar a la vista **"Comprobantes"**.
  2. Presionar el botón **"Sincronizar Pendientes con SUNAT"**.
  3. El sistema transmitirá en lote los comprobantes en cola y actualizará los estados a `accepted` con su respectivo CDR oficial.

---

### Caso 5: Error 403 Forbidden al declarar Mermas o Ajustes de Almacén
* **Síntoma:** Al intentar registrar una merma o baja de producto vencido, la interfaz muestra `Acceso denegado: El rol no tiene permisos para esta acción`.
* **Causa:** La sesión activa corresponde a un Técnico (`tech`) o Cajero (`cashier`).
* **Solución:**
  * Por exigencia de la normativa DIGEMID, la desafectación de inventario y destrucción de fármacos requiere la firma técnica de la Químico Farmacéutica (`qf`) o del Gerente General (`admin`).
  * Inicie sesión con credenciales de Directora Técnica o Gerencia para procesar el ajuste.

---

### Caso 6: Saturación de Almacenamiento en Disco
* **Síntoma:** Los contenedores se detienen con errores de `no space left on device`.
* **Solución y Limpieza Segura:**
  1. Purgar imágenes y capas huérfanas de Docker:
     ```bash
     docker system prune -f
     ```
  2. Verificar el tamaño del directorio de respaldos:
     ```bash
     du -sh ./backups/
     ```
  3. Comprobar que el script de rotación de 15 días esté activo. Si hay volcados manuales antiguos, elimínelos de forma segura:
     ```bash
     find ./backups/ -name "*.sql.gz" -mtime +15 -delete
     ```
