-- =============================================================
-- VALETEC PHARMA - ESQUEMA DE BASE DE DATOS RELACIONAL (SQLite WAL)
-- Integridad Referencial Estricta (ACID) y Trazabilidad DIGEMID
-- =============================================================

PRAGMA foreign_keys = ON;

-- 1. Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Usuarios y Personal de Turno
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  terminal TEXT DEFAULT 'Terminal 01',
  shift TEXT DEFAULT 'Mañana (08:00 - 16:00)',
  permissions TEXT,
  target TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. Categorías Farmacéuticas
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Catálogo Maestro de Medicamentos y Productos
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  generic_dci TEXT NOT NULL,
  laboratory TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  location TEXT NOT NULL,
  box_price REAL NOT NULL CHECK(box_price >= 0),
  blister_price REAL NOT NULL CHECK(blister_price >= 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  units_per_box INTEGER NOT NULL DEFAULT 100 CHECK(units_per_box > 0),
  units_per_blister INTEGER NOT NULL DEFAULT 10 CHECK(units_per_blister > 0),
  prescription_type TEXT NOT NULL DEFAULT 'free' CHECK(prescription_type IN ('free', 'required', 'retained')),
  generic_alt_id INTEGER,
  generic_saving_percent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (generic_alt_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 5. Lotes FEFO y Control de Almacén Kardex
CREATE TABLE IF NOT EXISTS lotes_fefo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  expire_date TEXT NOT NULL, -- Formato YYYY-MM-DD para orden cronológico FEFO
  stock_boxes INTEGER NOT NULL DEFAULT 0 CHECK(stock_boxes >= 0),
  stock_blisters INTEGER NOT NULL DEFAULT 0 CHECK(stock_blisters >= 0),
  stock_units INTEGER NOT NULL DEFAULT 0 CHECK(stock_units >= 0),
  fefo_status TEXT NOT NULL DEFAULT 'good' CHECK(fefo_status IN ('good', 'warning', 'expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 6. Libro Oficial de Controlados DIGEMID & Recetas Médicas
CREATE TABLE IF NOT EXISTS recetas_digemid (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  patient_dni TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_cmp TEXT NOT NULL,
  product_id INTEGER,
  medication_details TEXT NOT NULL,
  date_issued TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'retained' CHECK(status IN ('retained', 'approved', 'dispensed')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 7. Turnos y Arqueos de Caja (Apertura y Cierre Z)
CREATE TABLE IF NOT EXISTS caja_turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  terminal TEXT NOT NULL DEFAULT 'Caja 01',
  opening_balance REAL NOT NULL DEFAULT 350.00,
  cash_sales REAL NOT NULL DEFAULT 0.00,
  digital_sales REAL NOT NULL DEFAULT 0.00,
  expenses REAL NOT NULL DEFAULT 0.00,
  expected_balance REAL NOT NULL DEFAULT 350.00,
  counted_balance REAL DEFAULT 0.00,
  difference REAL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed_z')),
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 8. Movimientos de Caja Chica (Egresos e Ingresos Menores)
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('egreso', 'ingreso')),
  amount REAL NOT NULL CHECK(amount > 0),
  concept TEXT NOT NULL,
  responsible TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turno_id) REFERENCES caja_turnos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 9. Transacciones de Venta en Mostrador (Cabecera)
CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_series TEXT NOT NULL,
  invoice_number INTEGER NOT NULL,
  invoice_type TEXT NOT NULL CHECK(invoice_type IN ('boleta', 'factura', 'ticket')),
  user_id INTEGER NOT NULL,
  turno_id INTEGER,
  customer_doc TEXT,
  customer_name TEXT,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'yape', 'card')),
  subtotal REAL NOT NULL CHECK(subtotal >= 0),
  igv REAL NOT NULL CHECK(igv >= 0),
  total REAL NOT NULL CHECK(total >= 0),
  amount_paid REAL NOT NULL CHECK(amount_paid >= 0),
  change_given REAL NOT NULL DEFAULT 0.00 CHECK(change_given >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (turno_id) REFERENCES caja_turnos(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 10. Detalle de Operaciones de Venta (Partición por Fracción y Lote FEFO)
CREATE TABLE IF NOT EXISTS ventas_detalles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  lot_id INTEGER,
  fraction_type TEXT NOT NULL CHECK(fraction_type IN ('box', 'blister', 'unit')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  subtotal REAL NOT NULL CHECK(subtotal >= 0),
  FOREIGN KEY (sale_id) REFERENCES ventas(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (lot_id) REFERENCES lotes_fefo(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Índices de Alto Rendimiento para Búsqueda Instantánea en Mostrador y Almacén
CREATE INDEX IF NOT EXISTS idx_productos_barcode ON productos(barcode);
CREATE INDEX IF NOT EXISTS idx_productos_name ON productos(name);
CREATE INDEX IF NOT EXISTS idx_productos_dci ON productos(generic_dci);
CREATE INDEX IF NOT EXISTS idx_lotes_fefo_expire ON lotes_fefo(expire_date);
CREATE INDEX IF NOT EXISTS idx_recetas_folio ON recetas_digemid(folio);
CREATE INDEX IF NOT EXISTS idx_ventas_created ON ventas(created_at);
