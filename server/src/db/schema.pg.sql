-- =============================================================
-- VALETEC PHARMA - ESQUEMA DE BASE DE DATOS POSTGRESQL 16
-- Integridad Referencial Estricta (ACID) y Trazabilidad DIGEMID
-- =============================================================

-- 1. Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Usuarios y Personal de Turno
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  terminal VARCHAR(50) DEFAULT 'Terminal 01',
  shift VARCHAR(100) DEFAULT 'Mañana (08:00 - 16:00)',
  permissions TEXT,
  target VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Categorías Farmacéuticas
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Catálogo Maestro de Medicamentos y Productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  generic_dci VARCHAR(200) NOT NULL,
  laboratory VARCHAR(150) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  location VARCHAR(100) NOT NULL,
  box_price NUMERIC(10, 2) NOT NULL CHECK(box_price >= 0),
  blister_price NUMERIC(10, 2) NOT NULL CHECK(blister_price >= 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK(unit_price >= 0),
  units_per_box INTEGER NOT NULL DEFAULT 100 CHECK(units_per_box > 0),
  units_per_blister INTEGER NOT NULL DEFAULT 10 CHECK(units_per_blister > 0),
  prescription_type VARCHAR(20) NOT NULL DEFAULT 'free' CHECK(prescription_type IN ('free', 'required', 'retained')),
  generic_alt_id INTEGER REFERENCES productos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  generic_saving_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Lotes FEFO y Control de Almacén Kardex
CREATE TABLE IF NOT EXISTS lotes_fefo (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES productos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  lot_number VARCHAR(50) NOT NULL,
  expire_date DATE NOT NULL,
  stock_boxes INTEGER NOT NULL DEFAULT 0 CHECK(stock_boxes >= 0),
  stock_blisters INTEGER NOT NULL DEFAULT 0 CHECK(stock_blisters >= 0),
  stock_units INTEGER NOT NULL DEFAULT 0 CHECK(stock_units >= 0),
  fefo_status VARCHAR(20) NOT NULL DEFAULT 'good' CHECK(fefo_status IN ('good', 'warning', 'expired')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Libro Oficial de Controlados DIGEMID & Recetas Médicas
CREATE TABLE IF NOT EXISTS recetas_digemid (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(50) NOT NULL UNIQUE,
  patient_name VARCHAR(150) NOT NULL,
  patient_dni VARCHAR(20) NOT NULL,
  doctor_name VARCHAR(150) NOT NULL,
  doctor_cmp VARCHAR(50) NOT NULL,
  product_id INTEGER REFERENCES productos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  medication_details TEXT NOT NULL,
  date_issued VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'retained' CHECK(status IN ('retained', 'approved', 'dispensed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Turnos y Arqueos de Caja (Apertura y Cierre Z)
CREATE TABLE IF NOT EXISTS caja_turnos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  terminal VARCHAR(50) NOT NULL DEFAULT 'Caja 01',
  opening_balance NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  digital_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expected_balance NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
  counted_balance NUMERIC(10, 2) DEFAULT 0.00,
  difference NUMERIC(10, 2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed_z')),
  opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ
);

-- 8. Movimientos de Caja Chica (Egresos e Ingresos Menores)
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id SERIAL PRIMARY KEY,
  turno_id INTEGER NOT NULL REFERENCES caja_turnos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK(type IN ('egreso', 'ingreso')),
  amount NUMERIC(10, 2) NOT NULL CHECK(amount > 0),
  concept TEXT NOT NULL,
  responsible VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Transacciones de Venta en Mostrador (Cabecera)
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  invoice_series VARCHAR(10) NOT NULL,
  invoice_number INTEGER NOT NULL,
  invoice_type VARCHAR(20) NOT NULL CHECK(invoice_type IN ('boleta', 'factura', 'ticket')),
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  turno_id INTEGER REFERENCES caja_turnos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  customer_doc VARCHAR(20),
  customer_name VARCHAR(150),
  payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash', 'yape', 'card')),
  subtotal NUMERIC(10, 2) NOT NULL CHECK(subtotal >= 0),
  igv NUMERIC(10, 2) NOT NULL CHECK(igv >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK(total >= 0),
  amount_paid NUMERIC(10, 2) NOT NULL CHECK(amount_paid >= 0),
  change_given NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK(change_given >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Detalle de Operaciones de Venta
CREATE TABLE IF NOT EXISTS ventas_detalles (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES ventas(id) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  lot_id INTEGER REFERENCES lotes_fefo(id) ON UPDATE CASCADE ON DELETE SET NULL,
  fraction_type VARCHAR(20) NOT NULL CHECK(fraction_type IN ('box', 'blister', 'unit')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK(unit_price >= 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK(subtotal >= 0)
);

-- Índices de Alto Rendimiento para Búsqueda Instantánea
CREATE INDEX IF NOT EXISTS idx_productos_barcode ON productos(barcode);
CREATE INDEX IF NOT EXISTS idx_productos_name ON productos(name);
CREATE INDEX IF NOT EXISTS idx_productos_dci ON productos(generic_dci);
CREATE INDEX IF NOT EXISTS idx_lotes_fefo_expire ON lotes_fefo(expire_date);
CREATE INDEX IF NOT EXISTS idx_recetas_folio ON recetas_digemid(folio);
CREATE INDEX IF NOT EXISTS idx_ventas_created ON ventas(created_at);
