const bcrypt = require('bcryptjs');
const { transaction, query } = require('./index');

function seedDatabase() {
  console.log('🌱 Sembrando datos maestros iniciales de VALETEC PHARMA...');

  return transaction(({ run, get }) => {
    // 1. Roles
    const rolesData = [
      { name: 'admin', label: 'Dueño / Gerente General', description: 'Control Total, Finanzas, Compras y Supervisión' },
      { name: 'qf', label: 'Química Farmacéutica (Regente)', description: 'Auditoría Técnica, Controlados DIGEMID y Lotes FEFO' },
      { name: 'tech', label: 'Técnico de Mostrador', description: 'Dispensación de Mostrador y Consulta de Stock' },
      { name: 'cashier', label: 'Cajero de Turno', description: 'Cobro POS, Arqueo de Gaveta y Control de Egresos' }
    ];

    for (const r of rolesData) {
      const existing = get('SELECT id FROM roles WHERE name = ?', [r.name]);
      if (!existing) {
        run('INSERT INTO roles (name, label, description) VALUES (?, ?, ?)', [r.name, r.label, r.description]);
      }
    }

    const roleMap = {};
    query('SELECT id, name FROM roles').forEach(r => { roleMap[r.name] = r.id; });

    // 2. Usuarios con contraseñas seguras hasheadas
    const salt = bcrypt.genSaltSync(10);
    const usersData = [
      {
        name: 'Ing. Juan Pérez',
        email: 'gerencia@valetec.pe',
        password: 'admin123',
        role_id: roleMap['admin'],
        terminal: 'Acceso Remoto Cloud',
        shift: 'Supervisión 24/7',
        permissions: 'Control Total, Finanzas, Compras',
        target: 'Rentabilidad 35%',
        status: 'active'
      },
      {
        name: 'Dra. Elena Vega',
        email: 'regencia@valetec.pe',
        password: 'qf123',
        role_id: roleMap['qf'],
        terminal: 'Regencia Q.F.',
        shift: 'Completo (08:00 - 18:00)',
        permissions: 'Auditoría, DIGEMID, Lotes',
        target: 'Cumplimiento BPA',
        status: 'active'
      },
      {
        name: 'Carlos Mendoza',
        email: 'mostrador@valetec.pe',
        password: 'tech123',
        role_id: roleMap['tech'],
        terminal: 'Terminal 01',
        shift: 'Mañana (08:00 - 16:00)',
        permissions: 'Dispensación, Consulta Stock',
        target: 'S/ 1,500.00',
        status: 'active'
      },
      {
        name: 'Rodrigo Soto',
        email: 'caja@valetec.pe',
        password: 'cashier123',
        role_id: roleMap['cashier'],
        terminal: 'Caja 01',
        shift: 'Mañana (08:00 - 16:00)',
        permissions: 'Cobro POS, Arqueo, Egresos',
        target: 'S/ 3,500.00',
        status: 'active'
      },
      {
        name: 'Mariana Silva',
        email: 'mariana@valetec.pe',
        password: 'tech123',
        role_id: roleMap['tech'],
        terminal: 'Terminal 02',
        shift: 'Tarde (14:00 - 22:00)',
        permissions: 'Dispensación, Consulta Stock',
        target: 'S/ 1,200.00',
        status: 'pending'
      }
    ];

    for (const u of usersData) {
      const existing = get('SELECT id FROM usuarios WHERE email = ?', [u.email]);
      if (!existing) {
        const hash = bcrypt.hashSync(u.password, salt);
        run(
          `INSERT INTO usuarios (role_id, name, email, password_hash, terminal, shift, permissions, target, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.role_id, u.name, u.email, hash, u.terminal, u.shift, u.permissions, u.target, u.status]
        );
      }
    }

    // 3. Categorías Farmacéuticas
    const catData = [
      { slug: 'dolor', name: 'Dolor y Fiebre', icon: 'bi-capsule' },
      { slug: 'antibioticos', name: 'Antibióticos y Antivirales', icon: 'bi-shield-plus' },
      { slug: 'digestivos', name: 'Gastrointestinal y Digestivos', icon: 'bi-heart-pulse' },
      { slug: 'controlados', name: 'Psicotrópicos y Controlados', icon: 'bi-lock' },
      { slug: 'vitaminas', name: 'Vitaminas y Suplementos', icon: 'bi-sun' },
      { slug: 'respiratorio', name: 'Respiratorio y Alergias', icon: 'bi-lungs' }
    ];

    for (const c of catData) {
      const existing = get('SELECT id FROM categorias WHERE slug = ?', [c.slug]);
      if (!existing) {
        run('INSERT INTO categorias (slug, name, icon) VALUES (?, ?, ?)', [c.slug, c.name, c.icon]);
      }
    }

    const catMap = {};
    query('SELECT id, slug FROM categorias').forEach(c => { catMap[c.slug] = c.id; });

    // 4. Catálogo Oficial de Medicamentos
    const productsData = [
      {
        barcode: '7750990001',
        name: 'Valetec-Dol Forte 500mg',
        generic_dci: 'Paracetamol 500mg + Cafeína 30mg',
        laboratory: 'Laboratorios Farmatec S.A.',
        category_slug: 'dolor',
        location: 'Pasillo 1 • Anaquel A-1',
        box_price: 28.00,
        blister_price: 3.00,
        unit_price: 0.35,
        units_per_box: 100,
        units_per_blister: 10,
        prescription_type: 'free',
        generic_saving_percent: 55,
        alt_barcode: '7750990007',
        lot: { number: 'L-24098', expire: '2027-08-30', boxes: 4, blisters: 14, units: 140, fefo: 'good' }
      },
      {
        barcode: '7750990002',
        name: 'Bio-Amoxil 500mg Cápsulas',
        generic_dci: 'Amoxicilina Trihidrato',
        laboratory: 'MedPharma Labs',
        category_slug: 'antibioticos',
        location: 'Zona Refrigerada • Gaveta B-1',
        box_price: 26.00,
        blister_price: 2.80,
        unit_price: 0.30,
        units_per_box: 100,
        units_per_blister: 10,
        prescription_type: 'required',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-24115', expire: '2026-11-15', boxes: 2, blisters: 8, units: 80, fefo: 'warning' }
      },
      {
        barcode: '7750990003',
        name: 'Farma-Naprox 550mg Tabletas',
        generic_dci: 'Naproxeno Sódico 550mg',
        laboratory: 'BioFarma Perú',
        category_slug: 'dolor',
        location: 'Pasillo 1 • Anaquel A-2',
        box_price: 42.00,
        blister_price: 4.50,
        unit_price: 0.55,
        units_per_box: 80,
        units_per_blister: 8,
        prescription_type: 'free',
        generic_saving_percent: 62,
        alt_barcode: '7750990008',
        lot: { number: 'L-23980', expire: '2028-02-28', boxes: 5, blisters: 10, units: 64, fefo: 'good' }
      },
      {
        barcode: '7750990004',
        name: 'Gastro-Bismut 262mg Masticables',
        generic_dci: 'Subsalicilato de Bismuto 262mg',
        laboratory: 'Droguería Andina S.A.C.',
        category_slug: 'digestivos',
        location: 'Pasillo 2 • Anaquel C-4',
        box_price: 34.00,
        blister_price: 3.60,
        unit_price: 0.40,
        units_per_box: 100,
        units_per_blister: 10,
        prescription_type: 'free',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-24310', expire: '2027-10-15', boxes: 3, blisters: 11, units: 110, fefo: 'good' }
      },
      {
        barcode: '7750990005',
        name: 'Sedafarma 2mg Ranuradas',
        generic_dci: 'Clonazepam (Psicotrópico Lista IV)',
        laboratory: 'MedPharma Labs',
        category_slug: 'controlados',
        location: 'Caja Fuerte Psicotrópicos (Custodia Q.F.)',
        box_price: 52.00,
        blister_price: 5.50,
        unit_price: 0.65,
        units_per_box: 100,
        units_per_blister: 10,
        prescription_type: 'retained',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-23842', expire: '2027-05-20', boxes: 1, blisters: 2, units: 25, fefo: 'good' }
      },
      {
        barcode: '7750990006',
        name: 'C-Vit Zinc Efervescente',
        generic_dci: 'Ácido Ascórbico 1000mg + Zinc 10mg',
        laboratory: 'BioFarma Perú',
        category_slug: 'vitaminas',
        location: 'Pasillo 3 • Anaquel D-1',
        box_price: 32.00,
        blister_price: 3.50,
        unit_price: 1.40,
        units_per_box: 30,
        units_per_blister: 10,
        prescription_type: 'free',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-22990', expire: '2026-04-10', boxes: 0, blisters: 0, units: 0, fefo: 'expired' }
      },
      {
        barcode: '7750990007',
        name: 'Paracetamol 500mg DCI Genérico',
        generic_dci: 'Paracetamol D.C.I.',
        laboratory: 'Laboratorios Farmatec S.A.',
        category_slug: 'dolor',
        location: 'Pasillo 1 • Anaquel A-1',
        box_price: 12.50,
        blister_price: 1.40,
        unit_price: 0.18,
        units_per_box: 100,
        units_per_blister: 10,
        prescription_type: 'free',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-24891', expire: '2028-06-18', boxes: 8, blisters: 20, units: 200, fefo: 'good' }
      },
      {
        barcode: '7750990008',
        name: 'Naproxeno 550mg Genérico Andina',
        generic_dci: 'Naproxeno Sódico Genérico',
        laboratory: 'Droguería Andina S.A.C.',
        category_slug: 'dolor',
        location: 'Pasillo 1 • Anaquel A-2',
        box_price: 16.00,
        blister_price: 1.80,
        unit_price: 0.22,
        units_per_box: 80,
        units_per_blister: 8,
        prescription_type: 'free',
        generic_saving_percent: 0,
        alt_barcode: null,
        lot: { number: 'L-24905', expire: '2028-05-10', boxes: 6, blisters: 12, units: 96, fefo: 'good' }
      }
    ];

    // Insert products first
    for (const p of productsData) {
      const existing = get('SELECT id FROM productos WHERE barcode = ?', [p.barcode]);
      if (!existing) {
        const catId = catMap[p.category_slug];
        run(
          `INSERT INTO productos 
           (barcode, name, generic_dci, laboratory, category_id, location, box_price, blister_price, unit_price, units_per_box, units_per_blister, prescription_type, generic_saving_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.barcode, p.name, p.generic_dci, p.laboratory, catId, p.location, p.box_price, p.blister_price, p.unit_price, p.units_per_box, p.units_per_blister, p.prescription_type, p.generic_saving_percent]
        );
      }
    }

    // Link alternative generics and seed FEFO lots
    for (const p of productsData) {
      const prod = get('SELECT id FROM productos WHERE barcode = ?', [p.barcode]);
      if (prod) {
        if (p.alt_barcode) {
          const alt = get('SELECT id FROM productos WHERE barcode = ?', [p.alt_barcode]);
          if (alt) {
            run('UPDATE productos SET generic_alt_id = ? WHERE id = ?', [alt.id, prod.id]);
          }
        }

        // FEFO Lot
        const existingLot = get('SELECT id FROM lotes_fefo WHERE product_id = ? AND lot_number = ?', [prod.id, p.lot.number]);
        if (!existingLot) {
          run(
            `INSERT INTO lotes_fefo (product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [prod.id, p.lot.number, p.lot.expire, p.lot.boxes, p.lot.blisters, p.lot.units, p.lot.fefo]
          );
        }
      }
    }

    // 5. Recetas DIGEMID
    const digemidData = [
      {
        folio: 'REC-2026-0041',
        patient_name: 'Paciente Demo Uno',
        patient_dni: '10293847',
        doctor_name: 'Dr. Manuel Ramos',
        doctor_cmp: 'CMP-48291',
        medication_details: 'Bio-Amoxil 500mg Cápsulas (21 unidades)',
        date_issued: '18/09/2026',
        status: 'approved',
        notes: 'Receta archivada en expediente de antibióticos.'
      },
      {
        folio: 'REC-2026-0040',
        patient_name: 'Paciente Demo Dos',
        patient_dni: '44839201',
        doctor_name: 'Dra. Rosa Benítez',
        doctor_cmp: 'CMP-59102',
        medication_details: 'Sedafarma 2mg Ranuradas (30 unidades)',
        date_issued: '18/09/2026',
        status: 'retained',
        notes: 'Receta retenida en Libro Oficial de Psicotrópicos Lista IV.'
      },
      {
        folio: 'REC-2026-0039',
        patient_name: 'Paciente Demo Tres',
        patient_dni: '08291834',
        doctor_name: 'Dr. Alberto Vega',
        doctor_cmp: 'CMP-33201',
        medication_details: 'Azitromicina 500mg (3 unidades)',
        date_issued: '17/09/2026',
        status: 'dispensed',
        notes: 'Dispensación completada y balance cerrado.'
      }
    ];

    for (const r of digemidData) {
      const existing = get('SELECT id FROM recetas_digemid WHERE folio = ?', [r.folio]);
      if (!existing) {
        run(
          `INSERT INTO recetas_digemid (folio, patient_name, patient_dni, doctor_name, doctor_cmp, medication_details, date_issued, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.folio, r.patient_name, r.patient_dni, r.doctor_name, r.doctor_cmp, r.medication_details, r.date_issued, r.status, r.notes]
        );
      }
    }

    // 6. Turno y Movimientos de Caja Demo
    const cashierUser = get('SELECT id FROM usuarios WHERE email = ?', ['caja@valetec.pe']);
    if (cashierUser) {
      let turno = get('SELECT id FROM caja_turnos WHERE user_id = ? AND status = ?', [cashierUser.id, 'open']);
      if (!turno) {
        run(
          `INSERT INTO caja_turnos 
           (user_id, terminal, opening_balance, cash_sales, digital_sales, expenses, expected_balance, counted_balance, difference, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cashierUser.id, 'Caja 01', 350.00, 1725.50, 3052.00, 70.00, 2005.50, 2005.50, 0.00, 'open']
        );
        turno = get('SELECT id FROM caja_turnos WHERE user_id = ? AND status = ?', [cashierUser.id, 'open']);
      }

      if (turno) {
        const movCount = get('SELECT COUNT(*) as count FROM caja_movimientos WHERE turno_id = ?', [turno.id]);
        if (movCount.count === 0) {
          run(
            `INSERT INTO caja_movimientos (turno_id, type, amount, concept, responsible)
             VALUES (?, ?, ?, ?, ?)`,
            [turno.id, 'egreso', 45.00, 'Compra artículos de limpieza de farmacia', 'Rodrigo Soto']
          );
          run(
            `INSERT INTO caja_movimientos (turno_id, type, amount, concept, responsible)
             VALUES (?, ?, ?, ?, ?)`,
            [turno.id, 'egreso', 25.00, 'Botellón de agua para dispensador', 'Rodrigo Soto']
          );
        }
      }
    }

    console.log('✅ Seeding finalizado con éxito.');
    return true;
  });
}

// Allow direct CLI execution: node src/db/seed.js
if (require.main === module) {
  try {
    seedDatabase();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en el seeder:', err);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
