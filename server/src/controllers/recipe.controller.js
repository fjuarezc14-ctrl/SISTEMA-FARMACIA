const { query, run, get } = require('../db');

/**
 * Obtener recetas médicas DIGEMID desde PostgreSQL con filtros opcionales
 */
async function getAllRecipes(req, res, next) {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT 
        r.id,
        r.folio,
        r.patient_name AS "patientName",
        r.patient_dni AS "patientDni",
        r.doctor_name AS "doctorName",
        r.doctor_cmp AS "doctorCmp",
        r.product_id AS "productId",
        p.name AS "productName",
        r.medication_details AS "medication",
        r.date_issued AS "dateIssued",
        r.status,
        r.notes,
        r.created_at AS "createdAt"
      FROM recetas_digemid r
      LEFT JOIN productos p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && ['retained', 'approved', 'dispensed'].includes(status)) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    if (search && search.trim().length > 0) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (
        LOWER(r.patient_name) LIKE $${params.length} OR 
        LOWER(r.doctor_name) LIKE $${params.length} OR 
        LOWER(r.doctor_cmp) LIKE $${params.length} OR 
        LOWER(r.folio) LIKE $${params.length} OR
        LOWER(r.medication_details) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY r.id DESC;';

    const recipes = await query(sql, params);

    res.status(200).json({
      success: true,
      count: recipes.length,
      source: 'PostgreSQL 16',
      data: recipes
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar y foliar una nueva receta médica en el Libro Oficial de Controlados DIGEMID
 */
async function createRecipe(req, res, next) {
  try {
    const {
      patientName,
      patientDni,
      doctorName,
      doctorCmp,
      productId,
      medicationDetails,
      dateIssued,
      notes
    } = req.body;

    // 1. Validaciones sanitarias obligatorias
    if (!patientName || patientName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El nombre completo del paciente es obligatorio para el Libro Oficial.'
      });
    }

    if (!patientDni || patientDni.trim().length < 8) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El DNI o documento de identidad del paciente es obligatorio (mínimo 8 dígitos).'
      });
    }

    if (!doctorName || doctorName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El nombre del médico tratante es obligatorio.'
      });
    }

    if (!doctorCmp || doctorCmp.trim().length < 4) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El CMP (Colegio Médico del Perú) del doctor es obligatorio por normativa DIGEMID.'
      });
    }

    if (!medicationDetails || medicationDetails.trim().length < 3) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Debes detallar la medicina prescrita y la posología.'
      });
    }

    // Formatear CMP (asegurar prefijo CMP- si solo ingresan dígitos)
    const formattedCmp = doctorCmp.trim().toUpperCase().startsWith('CMP') 
      ? doctorCmp.trim().toUpperCase() 
      : `CMP-${doctorCmp.trim()}`;

    // 2. Generar correlativo consecutivo oficial: REC-2026-XXXX
    const allFolioRows = await query(
      `SELECT folio FROM recetas_digemid WHERE folio LIKE 'REC-2026-%'`
    );

    let maxNum = 41;
    for (const r of allFolioRows) {
      const match = r.folio.match(/REC-2026-(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > maxNum) maxNum = parsed;
      }
    }
    const nextNum = maxNum + 1;
    const newFolio = `REC-2026-${String(nextNum).padStart(4, '0')}`;

    // Fecha de emisión
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const finalDate = dateIssued || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    // 3. Insertar en PostgreSQL
    const insertRes = await get(
      `INSERT INTO recetas_digemid 
       (folio, patient_name, patient_dni, doctor_name, doctor_cmp, product_id, medication_details, date_issued, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'retained', $9)
       RETURNING id, created_at`,
      [
        newFolio,
        patientName.trim(),
        patientDni.trim(),
        doctorName.trim(),
        formattedCmp,
        productId ? parseInt(productId, 10) : null,
        medicationDetails.trim(),
        finalDate,
        notes ? notes.trim() : 'Receta archivada en custodia de Regencia Sanitaria Q.F.'
      ]
    );

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Receta foliada exitosamente con N° ${newFolio} en el Libro Oficial DIGEMID.`,
      data: {
        id: insertRes.id,
        folio: newFolio,
        patientName: patientName.trim(),
        patientDni: patientDni.trim(),
        doctorName: doctorName.trim(),
        doctorCmp: formattedCmp,
        medication: medicationDetails.trim(),
        dateIssued: finalDate,
        status: 'retained',
        createdAt: insertRes.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar estado de una receta (retained -> approved -> dispensed)
 */
async function updateRecipeStatus(req, res, next) {
  try {
    const { folio } = req.params;
    const { status } = req.body;

    if (!['retained', 'approved', 'dispensed'].includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Estado inválido. Debe ser: retained, approved o dispensed.'
      });
    }

    const updateRes = await run(
      'UPDATE recetas_digemid SET status = $1 WHERE folio = $2',
      [status, folio]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Receta con folio ${folio} no encontrada en el Libro Oficial.`
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Receta ${folio} actualizada a estado "${status}" en el Libro Oficial.`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generar Reporte Oficial de Balance Sanitario DIGEMID (Psicotrópicos y Antibióticos)
 */
async function getSanitaryBalance(req, res, next) {
  try {
    // 1. Estadísticas de recetas
    const stats = await get(`
      SELECT 
        COUNT(*) AS total_records,
        COALESCE(SUM(CASE WHEN status = 'retained' THEN 1 ELSE 0 END), 0) AS retained_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
        COALESCE(SUM(CASE WHEN status = 'dispensed' THEN 1 ELSE 0 END), 0) AS dispensed_count
      FROM recetas_digemid
    `);

    // 2. Stock controlado en caja fuerte (Sedafarma / Clonazepam)
    const controlledStock = await get(`
      SELECT 
        p.id,
        p.name,
        p.generic_dci,
        p.location,
        COALESCE(SUM(l.stock_units), 0) AS total_units_in_vault,
        COALESCE(SUM(l.stock_boxes), 0) AS total_boxes
      FROM productos p
      LEFT JOIN lotes_fefo l ON p.id = l.product_id
      WHERE p.prescription_type = 'retained'
      GROUP BY p.id, p.name, p.generic_dci, p.location
      LIMIT 1
    `);

    // 3. Listado foliado oficial completo
    const records = await query(`
      SELECT 
        r.folio,
        r.patient_name AS "patientName",
        r.patient_dni AS "patientDni",
        r.doctor_name AS "doctorName",
        r.doctor_cmp AS "doctorCmp",
        r.medication_details AS "medication",
        r.date_issued AS "dateIssued",
        r.status,
        r.notes
      FROM recetas_digemid r
      ORDER BY r.id ASC
    `);

    let establishment = {
      name: 'BOTICA VALETEC PHARMA S.A.C.',
      ruc: '20601234567',
      sanitaryLicense: 'DIRIS-LC N° 10842-FAR',
      address: 'Av. Aviación 2450, San Borja, Lima',
      technicalDirector: 'Dra. Elena Vega (Q.F. Reg. CQFP 18492)'
    };

    try {
      const configRow = await get(`
        SELECT company_name, ruc, address, sanitary_license, technical_director
        FROM configuraciones
        ORDER BY id ASC
        LIMIT 1
      `);
      if (configRow) {
        if (configRow.company_name) establishment.name = configRow.company_name;
        if (configRow.ruc) establishment.ruc = configRow.ruc;
        if (configRow.sanitary_license) establishment.sanitaryLicense = configRow.sanitary_license;
        if (configRow.address) establishment.address = configRow.address;
        if (configRow.technical_director) establishment.technicalDirector = configRow.technical_director;
      }
    } catch (e) {}

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        establishment,
        summary: {
          totalLedgerEntries: parseInt(stats.total_records, 10),
          retainedCount: parseInt(stats.retained_count, 10),
          approvedCount: parseInt(stats.approved_count, 10),
          dispensedCount: parseInt(stats.dispensed_count, 10)
        },
        vaultInventory: controlledStock ? {
          productName: controlledStock.name,
          genericDci: controlledStock.generic_dci,
          location: controlledStock.location,
          unitsInVault: parseInt(controlledStock.total_units_in_vault, 10),
          boxesInVault: parseInt(controlledStock.total_boxes, 10)
        } : null,
        records
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRecipes,
  createRecipe,
  updateRecipeStatus,
  getSanitaryBalance
};
