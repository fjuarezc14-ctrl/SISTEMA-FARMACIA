const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: RECIPE (RECETAS MÉDICAS Y PSICOTRÓPICOS DIGEMID)
 * ============================================================================
 * Representa el Libro Oficial de Controlados (Lista IV) y el archivo de recetas
 * médicas retenidas para fiscalización de DIGEMID / MINSA.
 */
class RecipeModel {
  /**
   * Estados oficiales de una receta según normativa sanitaria
   */
  static ALLOWED_STATUSES = ['retained', 'approved', 'dispensed'];

  /**
   * Validaciones defensivas de integridad sanitaria para una receta médica.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Paciente (Nombre y Documento)
    if (!isUpdate || data.patientName !== undefined) {
      if (!data.patientName || typeof data.patientName !== 'string') {
        errors.push('El nombre completo del paciente es obligatorio.');
      } else {
        const cleanName = data.patientName.trim();
        if (cleanName.length < 3 || cleanName.length > 150) {
          errors.push('El nombre del paciente debe tener entre 3 y 150 caracteres.');
        }
      }
    }

    if (!isUpdate || data.patientDni !== undefined) {
      if (!data.patientDni || typeof data.patientDni !== 'string') {
        errors.push('El DNI o documento del paciente es obligatorio.');
      } else {
        const cleanDni = data.patientDni.trim();
        if (cleanDni.length < 8 || cleanDni.length > 20) {
          errors.push('El documento del paciente debe tener entre 8 y 20 caracteres.');
        }
      }
    }

    // 2. Médico Prescriptor (Nombre y CMP)
    if (!isUpdate || data.doctorName !== undefined) {
      if (!data.doctorName || typeof data.doctorName !== 'string') {
        errors.push('El nombre del médico tratante es obligatorio.');
      } else {
        const cleanDoctor = data.doctorName.trim();
        if (cleanDoctor.length < 3 || cleanDoctor.length > 150) {
          errors.push('El nombre del médico debe tener entre 3 y 150 caracteres.');
        }
      }
    }

    if (!isUpdate || data.doctorCmp !== undefined) {
      if (!data.doctorCmp || typeof data.doctorCmp !== 'string') {
        errors.push('El número de colegiatura médica (CMP) es obligatorio.');
      } else {
        const cleanCmp = data.doctorCmp.trim();
        if (cleanCmp.length < 3 || cleanCmp.length > 50) {
          errors.push('El CMP del médico debe tener entre 3 y 50 caracteres.');
        }
      }
    }

    // 3. Fármaco y Detalles
    if (!isUpdate || data.medicationDetails !== undefined) {
      if (!data.medicationDetails || typeof data.medicationDetails !== 'string') {
        errors.push('La especificación del fármaco y posología es obligatoria.');
      } else if (data.medicationDetails.trim().length < 3) {
        errors.push('Los detalles del medicamento deben tener al menos 3 caracteres.');
      }
    }

    // 4. Fecha de emisión
    if (!isUpdate || data.dateIssued !== undefined) {
      if (!data.dateIssued || typeof data.dateIssued !== 'string' || data.dateIssued.trim().length === 0) {
        errors.push('La fecha de prescripción médica es obligatoria.');
      }
    }

    // 5. Estado sanitario
    if (data.status !== undefined && data.status !== null) {
      if (!RecipeModel.ALLOWED_STATUSES.includes(data.status)) {
        errors.push(`El estado de la receta debe ser uno de: ${RecipeModel.ALLOWED_STATUSES.join(', ')}.`);
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Validar que un ID numérico sea entero positivo.
   */
  static validateId(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0) {
      const err = new Error('El ID de receta debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Generar siguiente folio correlativo oficial para el Libro de Controlados (ej: REC-2026-0042).
   * @param {number|string} [currentYear] - Año actual.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<string>} Folio generado.
   */
  static async getNextFolio(currentYear = new Date().getFullYear(), dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const prefix = `REC-${currentYear}-`;

    const last = await getFn(`
      SELECT folio 
      FROM recetas_digemid 
      WHERE folio LIKE $1 
      ORDER BY id DESC 
      LIMIT 1;
    `, [`${prefix}%`]);

    let nextNumber = 1;
    if (last && last.folio) {
      const parts = last.folio.split('-');
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        nextNumber = lastSequence + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Obtener listado de recetas médicas con filtros opcionales de estado y búsqueda textual.
   * @param {Object} filters - { status, search }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getAll(filters = {}, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

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

    if (filters.status && RecipeModel.ALLOWED_STATUSES.includes(filters.status)) {
      params.push(filters.status);
      sql += ` AND r.status = $${params.length}`;
    }

    if (filters.search && typeof filters.search === 'string' && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim().toLowerCase()}%`);
      sql += ` AND (
        LOWER(r.patient_name) LIKE $${params.length} OR 
        LOWER(r.doctor_name) LIKE $${params.length} OR 
        LOWER(r.doctor_cmp) LIKE $${params.length} OR 
        LOWER(r.folio) LIKE $${params.length} OR
        LOWER(r.medication_details) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY r.id DESC;';

    return await queryFn(sql, params);
  }

  /**
   * Buscar una receta por su ID numérico.
   * @param {number|string} id - ID de la receta.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = RecipeModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
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
      WHERE r.id = $1
      LIMIT 1;
    `, [validId]);
  }

  /**
   * Buscar una receta por su folio único.
   * @param {string} folio - Folio de la receta.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findByFolio(folio, dbClient) {
    if (!folio || typeof folio !== 'string') return null;
    const cleanFolio = folio.trim();
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT * FROM recetas_digemid 
      WHERE folio = $1 
      LIMIT 1;
    `, [cleanFolio]);
  }

  /**
   * Registrar y foliar una nueva receta médica en el Libro Oficial de Controlados.
   * @param {Object} data - Atributos de la receta.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Receta registrada con su folio asignado.
   */
  static async create(data, dbClient) {
    RecipeModel.validate(data, false);

    // 1. Generar folio oficial si no se especificó uno
    const folio = data.folio ? data.folio.trim() : await RecipeModel.getNextFolio(new Date().getFullYear(), dbClient);

    // 2. Verificar que el folio no esté repetido
    const existing = await RecipeModel.findByFolio(folio, dbClient);
    if (existing) {
      const err = new Error(`El folio "${folio}" ya se encuentra registrado en el Libro Oficial.`);
      err.statusCode = 409;
      throw err;
    }

    const productId = data.productId ? parseInt(data.productId, 10) : null;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      INSERT INTO recetas_digemid (
        folio, patient_name, patient_dni, doctor_name, doctor_cmp,
        product_id, medication_details, date_issued, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        folio,
        patient_name AS "patientName",
        patient_dni AS "patientDni",
        doctor_name AS "doctorName",
        doctor_cmp AS "doctorCmp",
        product_id AS "productId",
        medication_details AS "medication",
        date_issued AS "dateIssued",
        status,
        notes,
        created_at AS "createdAt";
    `, [
      folio,
      data.patientName.trim(),
      data.patientDni.trim(),
      data.doctorName.trim(),
      data.doctorCmp.trim(),
      productId,
      data.medicationDetails.trim(),
      data.dateIssued.trim(),
      data.status || 'retained',
      data.notes ? data.notes.trim() : null
    ]);
  }

  /**
   * Actualizar el estado de dispensación sanitaria de una receta.
   * @param {number|string} id - ID de la receta.
   * @param {Object} data - { status, notes }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Receta actualizada.
   */
  static async updateStatus(id, { status, notes }, dbClient) {
    const validId = RecipeModel.validateId(id);

    if (!status || !RecipeModel.ALLOWED_STATUSES.includes(status)) {
      const err = new Error(`Estado sanitario inválido. Valores permitidos: ${RecipeModel.ALLOWED_STATUSES.join(', ')}.`);
      err.statusCode = 400;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const current = await RecipeModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Receta #${validId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    return await getFn(`
      UPDATE recetas_digemid
      SET status = $1, notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING 
        id,
        folio,
        patient_name AS "patientName",
        patient_dni AS "patientDni",
        doctor_name AS "doctorName",
        doctor_cmp AS "doctorCmp",
        product_id AS "productId",
        medication_details AS "medication",
        date_issued AS "dateIssued",
        status,
        notes,
        created_at AS "createdAt";
    `, [status, notes ? notes.trim() : null, validId]);
  }

  /**
   * Obtener productos controlados sujetos a fiscalización DIGEMID (prescription_type = 'retained').
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getControlledProducts(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        p.id, 
        p.name, 
        p.generic_dci, 
        p.laboratory, 
        p.sanitary_registry,
        p.units_per_box, 
        p.units_per_blister
      FROM productos p
      WHERE p.prescription_type = 'retained' AND p.status = 'active'
      ORDER BY p.name ASC;
    `);
  }

  /**
   * Obtener balance de entradas, salidas y recetas para el Libro Oficial de un medicamento controlado.
   * @param {number|string} productId - ID del medicamento.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async getControlledLedger(productId, dbClient) {
    const validId = RecipeModel.validateId(productId);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    // 1. Stock actual en lotes
    const stockRow = await getFn(`
      SELECT COALESCE(SUM(stock_units), 0)::int AS current_stock
      FROM lotes_fefo
      WHERE product_id = $1;
    `, [validId]);

    // 2. Total dispensado en ventas
    const salesRow = await getFn(`
      SELECT 
        COALESCE(SUM(vd.quantity), 0)::int AS units_dispensed,
        COUNT(DISTINCT vd.sale_id)::int AS sales_count
      FROM ventas_detalles vd
      JOIN ventas v ON vd.sale_id = v.id
      WHERE vd.product_id = $1 AND v.status = 'completed';
    `, [validId]);

    // 3. Recetas archivadas y retenidas
    const recipes = await queryFn(`
      SELECT 
        folio, 
        patient_name AS "patientName", 
        patient_dni AS "patientDni", 
        doctor_name AS "doctorName", 
        doctor_cmp AS "doctorCmp", 
        date_issued AS "dateIssued", 
        status
      FROM recetas_digemid
      WHERE product_id = $1
      ORDER BY id DESC;
    `, [validId]);

    return {
      currentStock: stockRow ? stockRow.current_stock : 0,
      unitsDispensed: salesRow ? salesRow.units_dispensed : 0,
      salesCount: salesRow ? salesRow.sales_count : 0,
      retainedRecipesCount: recipes.length,
      recipes
    };
  }

  /**
   * Obtiene estadísticas globales de recetas e inventario en bóveda para el Balance Sanitario DIGEMID.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getSanitaryBalanceStats(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const stats = await getFn(`
      SELECT 
        COUNT(*) AS total_records,
        COALESCE(SUM(CASE WHEN status = 'retained' THEN 1 ELSE 0 END), 0) AS retained_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
        COALESCE(SUM(CASE WHEN status = 'dispensed' THEN 1 ELSE 0 END), 0) AS dispensed_count
      FROM recetas_digemid;
    `);

    const controlledStock = await getFn(`
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
      LIMIT 1;
    `);

    return { stats, controlledStock };
  }
}

module.exports = RecipeModel;
