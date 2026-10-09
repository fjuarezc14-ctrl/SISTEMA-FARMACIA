const { query, get, run, transaction } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: PRODUCT (CATÁLOGO, PRECIOS Y LOTES FEFO)
 * ============================================================================
 * Representa los medicamentos, productos farmacéuticos y sus lotes de stock.
 * Encapsula la lógica de dispensación FEFO, candados de concurrencia y precios.
 */
class ProductModel {
  /**
   * Tipos de prescripción médica admitidos por DIGEMID
   */
  static PRESCRIPTION_TYPES = ['free', 'required', 'retained'];

  /**
   * Validaciones defensivas de integridad para los atributos de un producto.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Validación de 'barcode'
    if (!isUpdate || data.barcode !== undefined) {
      if (!data.barcode || typeof data.barcode !== 'string') {
        errors.push('El código de barras es obligatorio.');
      } else {
        const cleanBarcode = data.barcode.trim();
        if (cleanBarcode.length < 3 || cleanBarcode.length > 50) {
          errors.push('El código de barras debe tener entre 3 y 50 caracteres.');
        }
        if (/\s/.test(cleanBarcode)) {
          errors.push('El código de barras no puede contener espacios en blanco.');
        }
      }
    }

    // 2. Validación de 'name'
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('El nombre comercial del medicamento es obligatorio.');
      } else {
        const cleanName = data.name.trim();
        if (cleanName.length < 2 || cleanName.length > 200) {
          errors.push('El nombre comercial debe tener entre 2 y 200 caracteres.');
        }
      }
    }

    // 3. Validación de 'generic_dci'
    if (!isUpdate || data.generic_dci !== undefined || data.genericDci !== undefined) {
      const dci = data.generic_dci || data.genericDci;
      if (!dci || typeof dci !== 'string') {
        errors.push('El principio activo (D.C.I.) es obligatorio.');
      } else if (dci.trim().length < 2 || dci.trim().length > 200) {
        errors.push('El principio activo (D.C.I.) debe tener entre 2 y 200 caracteres.');
      }
    }

    // 4. Validación de 'laboratory'
    if (!isUpdate || data.laboratory !== undefined) {
      if (!data.laboratory || typeof data.laboratory !== 'string') {
        errors.push('El laboratorio fabricante es obligatorio.');
      } else if (data.laboratory.trim().length < 2 || data.laboratory.trim().length > 150) {
        errors.push('El nombre del laboratorio debe tener entre 2 y 150 caracteres.');
      }
    }

    // 5. Validación de 'category_id'
    if (!isUpdate || data.category_id !== undefined || data.categoryId !== undefined) {
      const catId = data.category_id !== undefined ? data.category_id : data.categoryId;
      const numCat = parseInt(catId, 10);
      if (isNaN(numCat) || numCat <= 0) {
        errors.push('Debe asignarse una categoría válida (número entero positivo).');
      }
    }

    // 6. Validación de Precios (Caja, Blíster, Unidad - las 3 presentaciones son opcionales, pero al menos una debe tener precio > 0)
    const parsePrice = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const p = parseFloat(val);
      return isNaN(p) ? null : p;
    };

    const bp = parsePrice(data.box_price !== undefined ? data.box_price : data.boxPrice);
    const blp = parsePrice(data.blister_price !== undefined ? data.blister_price : data.blisterPrice);
    const up = parsePrice(data.unit_price !== undefined ? data.unit_price : data.unitPrice);

    const checkPriceValue = (val, name) => {
      if (val !== undefined && val !== null && val !== '') {
        const p = parseFloat(val);
        if (isNaN(p) || p < 0) {
          errors.push(`El precio de ${name} debe ser un número mayor o igual a cero.`);
        }
      }
    };

    checkPriceValue(data.box_price !== undefined ? data.box_price : data.boxPrice, 'caja');
    checkPriceValue(data.blister_price !== undefined ? data.blister_price : data.blisterPrice, 'blíster');
    checkPriceValue(data.unit_price !== undefined ? data.unit_price : data.unitPrice, 'unidad');

    if (!isUpdate) {
      const hasAnyValidPrice = (bp !== null && bp > 0) || (blp !== null && blp > 0) || (up !== null && up > 0);
      if (!hasAnyValidPrice) {
        errors.push('Debe registrar al menos un precio válido mayor a cero en caja, blíster o unidad.');
      }
    }

    // 7. Unidades por empaque (opcionales al crear con valores por defecto)
    let parsedUpb = null;
    const rawUpb = data.units_per_box !== undefined ? data.units_per_box : data.unitsPerBox;
    if (rawUpb !== undefined && rawUpb !== null && rawUpb !== '') {
      parsedUpb = parseInt(rawUpb, 10);
      if (isNaN(parsedUpb) || parsedUpb <= 0) {
        errors.push('Las unidades por caja deben ser un entero mayor a cero.');
      }
    }

    let parsedUpbl = null;
    const rawUpbl = data.units_per_blister !== undefined ? data.units_per_blister : data.unitsPerBlister;
    if (rawUpbl !== undefined && rawUpbl !== null && rawUpbl !== '') {
      parsedUpbl = parseInt(rawUpbl, 10);
      if (isNaN(parsedUpbl) || parsedUpbl <= 0) {
        errors.push('Las unidades por blíster deben ser un entero mayor a cero.');
      }
    }

    if (parsedUpb && parsedUpbl && parsedUpb > 1 && parsedUpbl > 1 && parsedUpbl > parsedUpb) {
      errors.push('Las unidades por blíster no pueden ser mayores a las unidades por caja.');
    }

    // 8. Tipo de prescripción médica (DIGEMID)
    if (data.prescription_type !== undefined || data.prescriptionType !== undefined) {
      const pType = data.prescription_type || data.prescriptionType;
      if (!ProductModel.PRESCRIPTION_TYPES.includes(pType)) {
        errors.push(`El tipo de receta debe ser uno de los siguientes: ${ProductModel.PRESCRIPTION_TYPES.join(', ')}.`);
      }
    }

    // 9. Estado
    if (data.status !== undefined && data.status !== null) {
      if (!['active', 'inactive'].includes(data.status)) {
        errors.push('El estado del producto debe ser "active" o "inactive".');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Validar formato de un lote FEFO antes de registrar o mover stock.
   */
  static validateLot(lotData) {
    const errors = [];
    if (!lotData.lotNumber && !lotData.lot_number) {
      errors.push('El número de lote es obligatorio.');
    }
    const expDate = lotData.expireDate || lotData.expire_date;
    if (!expDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(expDate).trim())) {
      errors.push('La fecha de vencimiento es obligatoria y debe tener formato YYYY-MM-DD.');
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
      const err = new Error('El ID debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener productos con categorías, lotes y totales de stock agregados.
   * Soporta paginación defensiva y filtros conservando compatibilidad retroactiva completa.
   * @param {Object} [options] - Opciones de consulta: { page, limit, search, categorySlug, status }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array|Object>} Arreglo directo de productos si no se pide página, u objeto paginado si se solicita.
   */
  static async getAll(options = {}, dbClient = null) {
    let opts = options;
    let client = dbClient;
    if (options && (options.query || options.connect)) {
      client = options;
      opts = {};
    }

    const queryFn = (client && client.query) ? client.query.bind(client) : query;
    const isPaginated = opts && (opts.page !== undefined || opts.limit !== undefined);

    const conditions = [];
    const params = [];

    // Filtro por término de búsqueda (Nombre, Principio Activo o Código de barras)
    if (opts.search && typeof opts.search === 'string' && opts.search.trim() !== '') {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.generic_dci ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }

    // Filtro por slug de categoría
    if (opts.categorySlug && typeof opts.categorySlug === 'string' && opts.categorySlug.trim() !== '') {
      params.push(opts.categorySlug.trim());
      conditions.push(`c.slug = $${params.length}`);
    }

    // Filtro por estado del producto ('active', 'inactive')
    if (opts.status && typeof opts.status === 'string') {
      params.push(opts.status.trim());
      conditions.push(`p.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let paginationClause = '';
    let pageNum = 1;
    let limitNum = 50;

    if (isPaginated) {
      pageNum = Math.max(parseInt(opts.page || 1, 10), 1);
      limitNum = Math.min(Math.max(parseInt(opts.limit || 50, 10), 1), 200);
      const offset = (pageNum - 1) * limitNum;
      params.push(limitNum);
      const limitParamIdx = params.length;
      params.push(offset);
      const offsetParamIdx = params.length;
      paginationClause = `LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;
    }

    const rows = await queryFn(`
      SELECT 
        p.id,
        p.barcode,
        p.name,
        p.generic_dci AS "genericDci",
        p.laboratory,
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        p.location,
        CAST(p.box_price AS FLOAT) AS "boxPrice",
        CAST(p.blister_price AS FLOAT) AS "blisterPrice",
        CAST(p.unit_price AS FLOAT) AS "unitPrice",
        p.units_per_box AS "unitsPerBox",
        p.units_per_blister AS "unitsPerBlister",
        p.prescription_type AS "prescriptionType",
        p.generic_saving_percent AS "genericSavingPercent",
        COALESCE(p.sanitary_registry, '') AS "sanitaryRegistry",
        COALESCE(p.status, 'active') AS "status",
        alt.id AS "genericAltId",
        alt.name AS "genericAltName",
        CAST(alt.box_price AS FLOAT) AS "genericAltBoxPrice",
        fefo.id AS "lotId",
        COALESCE(fefo.lot_number, 'N/A') AS "lotNumber",
        COALESCE(TO_CHAR(fefo.expire_date, 'YYYY-MM-DD'), 'N/A') AS "expireDate",
        COALESCE(tot.total_boxes, 0)::int AS "stockBoxes",
        COALESCE(tot.total_blisters, 0)::int AS "stockBlisters",
        COALESCE(tot.total_units, 0)::int AS "stockUnits",
        COALESCE(fefo.fefo_status, CASE WHEN COALESCE(tot.expired_units, 0) > 0 THEN 'expired' ELSE 'good' END) AS "fefoStatus",
        COALESCE(tot.lots_json, '[]'::json) AS "lots",
        COUNT(*) OVER() AS full_count
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      LEFT JOIN productos alt ON p.generic_alt_id = alt.id
      LEFT JOIN LATERAL (
        SELECT 
          COALESCE(SUM(CASE WHEN l.expire_date >= CURRENT_DATE THEN stock_boxes ELSE 0 END), 0) AS total_boxes,
          COALESCE(SUM(CASE WHEN l.expire_date >= CURRENT_DATE THEN stock_blisters ELSE 0 END), 0) AS total_blisters,
          COALESCE(SUM(CASE WHEN l.expire_date >= CURRENT_DATE THEN stock_units ELSE 0 END), 0) AS total_units,
          COALESCE(SUM(CASE WHEN l.expire_date < CURRENT_DATE THEN stock_units ELSE 0 END), 0) AS expired_units,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', l.id,
              'lotNumber', l.lot_number,
              'expireDate', TO_CHAR(l.expire_date, 'YYYY-MM-DD'),
              'stockBoxes', FLOOR(l.stock_units / GREATEST(1, p.units_per_box)),
              'stockBlisters', FLOOR((l.stock_units % GREATEST(1, p.units_per_box)) / GREATEST(1, p.units_per_blister)),
              'stockUnits', l.stock_units,
              'looseUnits', (l.stock_units % GREATEST(1, p.units_per_box)) % GREATEST(1, p.units_per_blister),
              'fefoStatus', l.fefo_status,
              'isExpired', (l.expire_date < CURRENT_DATE)
            ) ORDER BY l.expire_date ASC
          ) AS lots_json
        FROM lotes_fefo l
        WHERE l.product_id = p.id
      ) tot ON true
      LEFT JOIN LATERAL (
        SELECT id, lot_number, expire_date, fefo_status
        FROM lotes_fefo
        WHERE product_id = p.id AND stock_units > 0 AND expire_date >= CURRENT_DATE
        ORDER BY expire_date ASC, id ASC
        LIMIT 1
      ) fefo ON true
      ${whereClause}
      ORDER BY p.id ASC
      ${paginationClause};
    `, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;

    const formatted = rows.map(p => {
      const totalUnits = Math.max(0, parseInt(p.stockUnits, 10) || 0);
      const uBox = Math.max(1, parseInt(p.unitsPerBox, 10) || 100);
      const uBli = Math.max(1, parseInt(p.unitsPerBlister, 10) || 10);
      const boxes = Math.floor(totalUnits / uBox);
      const rem = totalUnits % uBox;
      const blisters = (uBli > 1 && uBli < uBox) ? Math.floor(rem / uBli) : 0;
      const looseUnits = (uBli > 1 && uBli < uBox) ? (rem % uBli) : rem;

      return {
        id: p.id,
        name: p.name,
        genericDci: p.genericDci,
        laboratory: p.laboratory,
        category: p.categorySlug,
        categoryName: p.categoryName,
        location: p.location,
        boxPrice: p.boxPrice,
        blisterPrice: p.blisterPrice,
        unitPrice: p.unitPrice,
        unitsPerBox: p.unitsPerBox,
        unitsPerBlister: p.unitsPerBlister,
        stockBoxes: boxes,
        stockBlisters: blisters,
        stockUnits: totalUnits,
        looseUnits: looseUnits,
        prescriptionType: p.prescriptionType,
        sanitaryRegistry: p.sanitaryRegistry,
        status: p.status,
        barcode: p.barcode,
        lotNumber: p.lotNumber || 'N/A',
        expireDate: p.expireDate || 'N/A',
        fefoStatus: p.fefoStatus || 'good',
        lots: p.lots || [],
        genericAlt: p.genericAltName ? {
          id: p.genericAltId,
          name: p.genericAltName,
          boxPrice: p.genericAltBoxPrice,
          savingPercent: p.genericSavingPercent || 50
        } : null
      };
    });

    if (isPaginated) {
      return {
        data: formatted,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1
        }
      };
    }

    return formatted;
  }

  /**
   * Buscar un producto por ID con ficha técnica completa y lotes detallados.
   * @param {number|string} id - ID del producto.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = ProductModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    const prod = await getFn(`
      SELECT 
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        CAST(p.box_price AS FLOAT) AS box_price,
        CAST(p.blister_price AS FLOAT) AS blister_price,
        CAST(p.unit_price AS FLOAT) AS unit_price
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      WHERE p.id = $1;
    `, [validId]);

    if (!prod) return null;

    const uBox = Math.max(1, parseInt(prod.units_per_box, 10) || 100);
    const uBli = Math.max(1, parseInt(prod.units_per_blister, 10) || 10);

    const lots = await queryFn(`
      SELECT 
        id, 
        lot_number AS "lotNumber", 
        TO_CHAR(expire_date, 'YYYY-MM-DD') AS "expireDate", 
        FLOOR(stock_units / GREATEST(1, $2))::int AS "stockBoxes", 
        FLOOR((stock_units % GREATEST(1, $2)) / GREATEST(1, $3))::int AS "stockBlisters", 
        stock_units AS "stockUnits", 
        ((stock_units % GREATEST(1, $2)) % GREATEST(1, $3))::int AS "looseUnits",
        fefo_status AS "fefoStatus"
      FROM lotes_fefo
      WHERE product_id = $1
      ORDER BY expire_date ASC;
    `, [validId, uBox, uBli]);

    return { ...prod, lots };
  }

  /**
   * Buscar un producto por su código de barras exacto (usado en mostrador POS).
   * @param {string} barcode - Código de barras.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findByBarcode(barcode, dbClient) {
    if (!barcode || typeof barcode !== 'string') return null;
    const cleanBarcode = barcode.trim();
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        CAST(p.box_price AS FLOAT) AS box_price,
        CAST(p.blister_price AS FLOAT) AS blister_price,
        CAST(p.unit_price AS FLOAT) AS unit_price
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      WHERE p.barcode = $1
      LIMIT 1;
    `, [cleanBarcode]);
  }

  /**
   * Consulta transaccional de lotes FEFO disponibles con candado pesimista FOR UPDATE.
   * Cumple con la normativa DIGEMID (filtra expire_date >= CURRENT_DATE).
   * @param {number|string} productId - ID del producto.
   * @param {Object} clientTx - Cliente transaccional OBLIGATORIO para el candado.
   * @returns {Promise<Array>} Lotes FEFO bloqueados ordenados por vencimiento ascendente.
   */
  static async getFefoLots(productId, clientTx) {
    const validId = ProductModel.validateId(productId);
    const queryFn = (clientTx && clientTx.query) ? clientTx.query.bind(clientTx) : query;

    return await queryFn(`
      SELECT 
        id, 
        lot_number, 
        expire_date, 
        stock_units, 
        stock_boxes, 
        stock_blisters
      FROM lotes_fefo
      WHERE product_id = $1 AND stock_units > 0 AND expire_date >= CURRENT_DATE
      ORDER BY expire_date ASC, id ASC
      FOR UPDATE;
    `, [validId]);
  }

  /**
   * Deducir pastillas/unidades de un lote específico recalculando fracciones.
   * @param {number|string} lotId - ID del lote.
   * @param {number} unitsToDeduct - Unidades mínimas a descontar.
   * @param {number} unitsPerBox - Factor de conversión por caja.
   * @param {number} unitsPerBlister - Factor de conversión por blíster.
   * @param {Object} clientTx - Cliente transaccional.
   */
  static async deductLotStock(lotId, unitsToDeduct, unitsPerBox = 100, unitsPerBlister = 10, clientTx) {
    const validId = ProductModel.validateId(lotId);
    const deduct = parseInt(unitsToDeduct, 10);
    if (isNaN(deduct) || deduct <= 0) return;

    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;

    await runFn(`
      UPDATE lotes_fefo 
      SET 
        stock_units = GREATEST(0, stock_units - $1),
        stock_boxes = FLOOR(GREATEST(0, stock_units - $1) / $2),
        stock_blisters = FLOOR(GREATEST(0, stock_units - $1) / $3),
        updated_at = NOW()
      WHERE id = $4;
    `, [deduct, unitsPerBox, unitsPerBlister, validId]);
  }

  /**
   * Restituir pastillas/unidades exactas a un lote tras anulación de venta.
   * @param {number|string} lotId - ID del lote.
   * @param {number} unitsToRestore - Unidades mínimas a devolver.
   * @param {number} unitsPerBox - Factor de caja.
   * @param {number} unitsPerBlister - Factor de blíster.
   * @param {Object} clientTx - Cliente transaccional.
   */
  static async restoreLotStock(lotId, unitsToRestore, unitsPerBox = 100, unitsPerBlister = 10, clientTx) {
    const validId = ProductModel.validateId(lotId);
    const restore = parseInt(unitsToRestore, 10);
    if (isNaN(restore) || restore <= 0) return;

    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;

    await runFn(`
      UPDATE lotes_fefo 
      SET 
        stock_units = stock_units + $1,
        stock_boxes = FLOOR((stock_units + $1) / $2),
        stock_blisters = FLOOR((stock_units + $1) / $3),
        updated_at = NOW()
      WHERE id = $4;
    `, [restore, unitsPerBox, unitsPerBlister, validId]);
  }

  /**
   * Crear un nuevo producto en el catálogo maestro y su lote inicial opcional.
   * @param {Object} data - Datos del producto y lote inicial opcional.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async create(data, dbClient) {
    ProductModel.validate(data, false);

    const cleanBarcode = data.barcode.trim();

    // 1. Verificar duplicidad de código de barras
    const existing = await ProductModel.findByBarcode(cleanBarcode, dbClient);
    if (existing) {
      const err = new Error(`El código de barras "${cleanBarcode}" ya está asignado al producto "${existing.name}".`);
      err.statusCode = 409;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    const boxP = parseFloat(data.box_price !== undefined ? data.box_price : (data.boxPrice !== undefined ? data.boxPrice : 0)) || 0;
    const blisterP = parseFloat(data.blister_price !== undefined ? data.blister_price : (data.blisterPrice !== undefined ? data.blisterPrice : 0)) || 0;
    const unitP = parseFloat(data.unit_price !== undefined ? data.unit_price : (data.unitPrice !== undefined ? data.unitPrice : 0)) || 0;

    const rawUnitsPerBox = data.units_per_box !== undefined ? data.units_per_box : data.unitsPerBox;
    const rawUnitsPerBlister = data.units_per_blister !== undefined ? data.units_per_blister : data.unitsPerBlister;

    let upb = rawUnitsPerBox ? parseInt(rawUnitsPerBox, 10) : null;
    let upbl = rawUnitsPerBlister ? parseInt(rawUnitsPerBlister, 10) : null;

    if (!upb || upb <= 0) {
      upb = (boxP === 0 || (unitP > 0 && boxP === 0 && blisterP === 0)) ? 1 : 100;
    }
    if (!upbl || upbl <= 0) {
      upbl = (blisterP === 0) ? 1 : 10;
    }

    const newProd = await getFn(`
      INSERT INTO productos (
        barcode, name, generic_dci, laboratory, category_id, location,
        box_price, blister_price, unit_price, units_per_box, units_per_blister,
        prescription_type, generic_saving_percent, sanitary_registry, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `, [
      cleanBarcode,
      data.name.trim(),
      (data.generic_dci || data.genericDci).trim(),
      data.laboratory.trim(),
      parseInt(data.category_id || data.categoryId, 10),
      (data.location || 'Almacén Central').trim(),
      boxP,
      blisterP,
      unitP,
      upb,
      upbl,
      data.prescription_type || data.prescriptionType || 'free',
      parseInt(data.generic_saving_percent || data.genericSavingPercent || 0, 10),
      data.sanitary_registry ? data.sanitary_registry.trim() : null,
      data.status || 'active'
    ]);

    // 2. Si se proporcionó un lote inicial (objeto o campos planos), crearlo
    const lotObj = data.initialLot || (data.lotNumber && data.expireDate ? {
      lotNumber: data.lotNumber,
      expireDate: data.expireDate,
      stockBoxes: data.initialBoxes || 0,
      stockBlisters: data.initialBlisters || 0,
      stockUnits: data.initialUnits || data.stockUnits || 0,
      fefoStatus: data.fefoStatus || 'good'
    } : null);

    if (lotObj && lotObj.lotNumber && lotObj.expireDate) {
      ProductModel.validateLot(lotObj);
      const boxes = parseInt(lotObj.stockBoxes || 0, 10);
      const blisters = parseInt(lotObj.stockBlisters || 0, 10);
      let units = parseInt(lotObj.stockUnits || 0, 10);

      if (units === 0 && (boxes > 0 || blisters > 0)) {
        units = (boxes * upb) + (blisters * upbl);
      }
      const finalBoxes = boxes > 0 ? boxes : (upb > 1 ? Math.floor(units / upb) : units);
      const finalBlisters = blisters > 0 ? blisters : (upbl > 1 ? Math.floor((units % upb) / upbl) : 0);

      const insertedLot = await getFn(`
        INSERT INTO lotes_fefo (product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        newProd.id,
        lotObj.lotNumber.trim(),
        lotObj.expireDate.trim(),
        finalBoxes,
        finalBlisters,
        units,
        lotObj.fefoStatus || 'good'
      ]);

      if (units > 0 && insertedLot) {
        await runFn(`
          INSERT INTO kardex (
            product_id, lot_id, movement_type, reference_type, reference_id,
            quantity, unit_type, previous_stock, new_stock, reason, user_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        `, [
          newProd.id,
          insertedLot.id,
          'init',
          'INVENTARIO_INICIAL',
          `INIT-${newProd.id}`,
          units,
          'unit',
          0,
          units,
          'Apertura de lote / Stock inicial de catálogo',
          'Administrador'
        ]);
      }
    }

    return newProd;
  }

  /**
   * Actualizar un producto existente.
   * @param {number|string} id - ID del producto.
   * @param {Object} data - Datos a actualizar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async update(id, data, dbClient) {
    const validId = ProductModel.validateId(id);
    ProductModel.validate(data, true);

    const current = await ProductModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Producto #${validId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    // Si se modifica el código de barras, validar duplicidad
    if (data.barcode && data.barcode.trim() !== current.barcode) {
      const duplicate = await ProductModel.findByBarcode(data.barcode.trim(), dbClient);
      if (duplicate && duplicate.id !== validId) {
        const err = new Error(`El código de barras "${data.barcode.trim()}" ya está asignado a otro producto.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const parsePriceParam = (val) => {
      if (val === undefined) return null;
      if (val === null || val === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    const boxParam = parsePriceParam(data.box_price !== undefined ? data.box_price : data.boxPrice);
    const blisterParam = parsePriceParam(data.blister_price !== undefined ? data.blister_price : data.blisterPrice);
    const unitParam = parsePriceParam(data.unit_price !== undefined ? data.unit_price : data.unitPrice);

    const finalBoxPrice = boxParam !== null ? boxParam : parseFloat(current.box_price || 0);
    const finalBlisterPrice = blisterParam !== null ? blisterParam : parseFloat(current.blister_price || 0);
    const finalUnitPrice = unitParam !== null ? unitParam : parseFloat(current.unit_price || 0);

    if (finalBoxPrice <= 0 && finalBlisterPrice <= 0 && finalUnitPrice <= 0) {
      const err = new Error('El producto debe mantener al menos una presentación activa (caja, blíster o unidad) con precio mayor a cero.');
      err.statusCode = 400;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      UPDATE productos SET
        barcode = COALESCE($1, barcode),
        name = COALESCE($2, name),
        generic_dci = COALESCE($3, generic_dci),
        laboratory = COALESCE($4, laboratory),
        category_id = COALESCE($5, category_id),
        location = COALESCE($6, location),
        box_price = COALESCE($7, box_price),
        blister_price = COALESCE($8, blister_price),
        unit_price = COALESCE($9, unit_price),
        units_per_box = COALESCE($10, units_per_box),
        units_per_blister = COALESCE($11, units_per_blister),
        prescription_type = COALESCE($12, prescription_type),
        generic_saving_percent = COALESCE($13, generic_saving_percent),
        sanitary_registry = COALESCE($14, sanitary_registry)
      WHERE id = $15
      RETURNING *;
    `, [
      data.barcode ? data.barcode.trim() : null,
      data.name ? data.name.trim() : null,
      (data.generic_dci || data.genericDci) ? (data.generic_dci || data.genericDci).trim() : null,
      data.laboratory ? data.laboratory.trim() : null,
      (data.category_id || data.categoryId) ? parseInt(data.category_id || data.categoryId, 10) : null,
      data.location ? data.location.trim() : null,
      boxParam,
      blisterParam,
      unitParam,
      (data.units_per_box || data.unitsPerBox) ? parseInt(data.units_per_box || data.unitsPerBox, 10) : null,
      (data.units_per_blister || data.unitsPerBlister) ? parseInt(data.units_per_blister || data.unitsPerBlister, 10) : null,
      (data.prescription_type || data.prescriptionType) || null,
      (data.generic_saving_percent !== undefined || data.genericSavingPercent !== undefined) ? parseInt(data.generic_saving_percent || data.genericSavingPercent, 10) : null,
      data.sanitary_registry !== undefined ? (data.sanitary_registry ? data.sanitary_registry.trim() : null) : null,
      validId
    ]);
  }

  /**
   * Alternar estado de un producto entre activo e inactivo.
   * @param {number|string} id - ID del producto.
   * @param {string} [forcedStatus] - 'active' o 'inactive'
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async toggleStatus(id, forcedStatus, dbClient) {
    const validId = ProductModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const current = await ProductModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Producto #${validId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    const nextStatus = forcedStatus || (current.status === 'active' ? 'inactive' : 'active');

    return await getFn(`
      UPDATE productos 
      SET status = $1 
      WHERE id = $2
      RETURNING id, name, status;
    `, [nextStatus, validId]);
  }

  /**
   * Obtener lotes próximos a vencer o vencidos para auditoría DIGEMID.
   * @param {number} [daysThreshold=90] - Días límite para considerar próximo a vencer.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getExpiringLots(daysThreshold = 90, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        l.id AS "lotId",
        l.lot_number AS "lotNumber",
        TO_CHAR(l.expire_date, 'YYYY-MM-DD') AS "expireDate",
        l.stock_boxes AS "stockBoxes",
        l.stock_blisters AS "stockBlisters",
        l.stock_units AS "stockUnits",
        l.fefo_status AS "fefoStatus",
        p.id AS "productId",
        p.name AS "productName",
        p.barcode,
        p.location,
        c.name AS "categoryName",
        (l.expire_date - CURRENT_DATE) AS "daysUntilExpire"
      FROM lotes_fefo l
      JOIN productos p ON l.product_id = p.id
      JOIN categorias c ON p.category_id = c.id
      WHERE l.stock_units > 0 
        AND l.expire_date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY l.expire_date ASC;
    `, [daysThreshold]);
  }

  /**
   * Crear un nuevo lote físico para un medicamento.
   * @param {number|string} productId - ID del producto.
   * @param {Object} lotData - { lotNumber, expireDate, stockBoxes, stockBlisters, stockUnits, fefoStatus }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async createLot(productId, lotData, dbClient) {
    const validId = ProductModel.validateId(productId);
    ProductModel.validateLot(lotData);

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      INSERT INTO lotes_fefo (
        product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        product_id AS "productId", 
        lot_number AS "lotNumber", 
        TO_CHAR(expire_date, 'YYYY-MM-DD') AS "expireDate", 
        stock_boxes AS "stockBoxes", 
        stock_blisters AS "stockBlisters", 
        stock_units AS "stockUnits", 
        fefo_status AS "fefoStatus";
    `, [
      validId,
      (lotData.lotNumber || lotData.lot_number).trim(),
      (lotData.expireDate || lotData.expire_date).trim(),
      parseInt(lotData.stockBoxes || 0, 10),
      parseInt(lotData.stockBlisters || 0, 10),
      parseInt(lotData.stockUnits || 0, 10),
      lotData.fefoStatus || 'good'
    ]);
  }

  /**
   * Ingreso de mercadería / stock al almacén con actualización de lotes FEFO.
   */
  static async addStock({ productId, lotNumber, expireDate, boxes, location }, dbClient) {
    const validId = ProductModel.validateId(productId);
    const numBoxes = parseInt(boxes, 10);
    if (isNaN(numBoxes) || numBoxes <= 0) {
      throw Object.assign(new Error('La cantidad de cajas debe ser mayor a cero.'), { statusCode: 400 });
    }

    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const prod = await ProductModel.findById(validId, dbClient);
    if (!prod) {
      throw Object.assign(new Error(`Producto #${validId} no encontrado en el catálogo.`), { statusCode: 404 });
    }

    const totalUnits = numBoxes * parseInt(prod.units_per_box, 10);
    const totalBlisters = numBoxes * (parseInt(prod.units_per_box, 10) / parseInt(prod.units_per_blister, 10));

    if (location) {
      await runFn('UPDATE productos SET location = $1 WHERE id = $2', [location, validId]);
    }

    const cleanLotNumber = lotNumber ? lotNumber.trim() : `L-${Math.floor(10000 + Math.random() * 90000)}`;
    const cleanExpireDate = expireDate || '2028-12-31';

    let lot = await getFn('SELECT id FROM lotes_fefo WHERE product_id = $1 AND lot_number = $2', [validId, cleanLotNumber]);
    if (lot) {
      await runFn(
        `UPDATE lotes_fefo 
         SET stock_boxes = stock_boxes + $1,
             stock_blisters = stock_blisters + $2,
             stock_units = stock_units + $3,
             expire_date = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [numBoxes, totalBlisters, totalUnits, cleanExpireDate, lot.id]
      );
    } else {
      await runFn(
        `INSERT INTO lotes_fefo (product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'good')`,
        [validId, cleanLotNumber, cleanExpireDate, numBoxes, totalBlisters, totalUnits]
      );
    }

    return {
      productName: prod.name,
      boxesAdded: numBoxes,
      unitsAdded: totalUnits
    };
  }

  /**
   * Ajuste manual de stock por merma, rotura o vencimiento con registro en Kardex.
   */
  static async adjustStock({ productId, lotId, adjustmentType, quantity, unitType, reason, userName }, dbClient) {
    const validId = ProductModel.validateId(productId);
    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      throw Object.assign(new Error('La cantidad debe ser un número entero mayor a 0.'), { statusCode: 400 });
    }

    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const prod = await ProductModel.findById(validId, dbClient);
    if (!prod) {
      throw Object.assign(new Error(`Producto #${validId} no encontrado.`), { statusCode: 404 });
    }

    const isDeduction = ['out', 'loss', 'expired', 'damage', 'spoilage', 'breakage', 'diff_out', 'donation'].includes(adjustmentType);
    const isAddition = ['diff_in', 'return_customer', 'in'].includes(adjustmentType);

    let lot = null;
    if (lotId && lotId !== 'auto') {
      const parsedLotId = parseInt(lotId, 10);
      if (!isNaN(parsedLotId) && parsedLotId > 0) {
        lot = await getFn('SELECT * FROM lotes_fefo WHERE id = $1 AND product_id = $2 FOR UPDATE', [parsedLotId, validId]);
      } else {
        lot = await getFn('SELECT * FROM lotes_fefo WHERE lot_number = $1 AND product_id = $2 FOR UPDATE', [String(lotId).trim(), validId]);
      }
    }

    if (!lot) {
      if (isDeduction) {
        lot = await getFn(
          `SELECT * FROM lotes_fefo 
           WHERE product_id = $1 AND stock_units > 0 
           ORDER BY expire_date ASC LIMIT 1 FOR UPDATE`,
          [validId]
        );
      } else {
        lot = await getFn(
          `SELECT * FROM lotes_fefo 
           WHERE product_id = $1 
           ORDER BY expire_date ASC LIMIT 1 FOR UPDATE`,
          [validId]
        );
      }
    }

    if (!lot && isAddition) {
      // Si el producto no tenía ningún lote registrado y se realiza un ingreso, crear lote automático
      const autoLotNum = `L-${Math.floor(10000 + Math.random() * 90000)}`;
      lot = await getFn(`
        INSERT INTO lotes_fefo (product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status)
        VALUES ($1, $2, (CURRENT_DATE + INTERVAL '2 years')::date, 0, 0, 0, 'good')
        RETURNING *;
      `, [validId, autoLotNum]);
    }

    if (!lot) {
      throw Object.assign(new Error(`No se encontró un lote disponible con existencias para el producto "${prod.name}".`), { statusCode: 404 });
    }

    let unitsToAdjust = numQty;
    if (unitType === 'box') {
      unitsToAdjust = numQty * parseInt(prod.units_per_box, 10);
    } else if (unitType === 'blister') {
      unitsToAdjust = numQty * parseInt(prod.units_per_blister, 10);
    }

    const prevStock = parseInt(lot.stock_units, 10);

    if (isDeduction && prevStock < unitsToAdjust) {
      throw Object.assign(new Error(`Stock insuficiente en el lote "${lot.lot_number}". Stock actual: ${prevStock} unidades, Solicitado: ${unitsToAdjust} unidades.`), { statusCode: 400 });
    }

    const newStock = isDeduction ? (prevStock - unitsToAdjust) : (prevStock + unitsToAdjust);
    const newBoxes = Math.floor(newStock / parseInt(prod.units_per_box, 10));
    const newBlisters = Math.floor(newStock / parseInt(prod.units_per_blister, 10));

    await runFn(
      `UPDATE lotes_fefo 
       SET stock_units = $1, stock_boxes = $2, stock_blisters = $3, updated_at = NOW() 
       WHERE id = $4`,
      [newStock, newBoxes, newBlisters, lot.id]
    );

    const kardexId = `ADJ-${Date.now()}`;
    await runFn(
      `INSERT INTO kardex (
         product_id, lot_id, movement_type, reference_type, reference_id,
         quantity, unit_type, previous_stock, new_stock, reason, user_name
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        validId,
        lot.id,
        adjustmentType,
        'AJUSTE_MANUAL',
        kardexId,
        isDeduction ? -unitsToAdjust : unitsToAdjust,
        unitType || 'unit',
        prevStock,
        newStock,
        reason,
        userName || 'Administrador'
      ]
    );

    return {
      lotNumber: lot.lot_number,
      previousStock: prevStock,
      newStock: newStock,
      unitsAdjusted: unitsToAdjust,
      kardexReference: kardexId
    };
  }

  /**
   * Reporte integral de alertas FEFO y lotes próximos a vencer.
   */
  static async getExpiringReport(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    return await queryFn(`
      SELECT 
        l.id AS "lotId",
        l.product_id AS "productId",
        p.name AS "productName",
        p.generic_dci AS "genericDci",
        p.laboratory,
        c.name AS "categoryName",
        l.lot_number AS "lotNumber",
        TO_CHAR(l.expire_date, 'YYYY-MM-DD') AS "expireDate",
        (l.expire_date - CURRENT_DATE) AS "daysLeft",
        l.stock_boxes AS "stockBoxes",
        l.stock_blisters AS "stockBlisters",
        l.stock_units AS "stockUnits",
        CASE 
          WHEN (l.expire_date - CURRENT_DATE) <= 0 THEN 'expired'
          WHEN (l.expire_date - CURRENT_DATE) <= 30 THEN 'critical'
          WHEN (l.expire_date - CURRENT_DATE) <= 90 THEN 'warning'
          ELSE 'safe'
        END AS "fefoAlert"
      FROM lotes_fefo l
      JOIN productos p ON l.product_id = p.id
      JOIN categorias c ON p.category_id = c.id
      WHERE l.stock_units > 0
      ORDER BY l.expire_date ASC;
    `);
  }

  /**
   * Crear lote para un producto registrando auditoría en Kardex.
   */
  static async createLotWithKardex(productId, lotData, dbClient) {
    const validId = ProductModel.validateId(productId);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    const prod = await ProductModel.findById(validId, dbClient);
    if (!prod) {
      throw Object.assign(new Error(`Medicamento #${validId} no encontrado.`), { statusCode: 404 });
    }

    const cleanLotNumber = (lotData.lotNumber || '').trim();
    const dup = await getFn('SELECT id FROM lotes_fefo WHERE product_id = $1 AND lot_number = $2', [validId, cleanLotNumber]);
    if (dup) {
      throw Object.assign(new Error(`El lote "${cleanLotNumber}" ya existe para este medicamento.`), { statusCode: 409 });
    }

    const boxes = parseInt(lotData.stockBoxes, 10) || 0;
    const blisters = parseInt(lotData.stockBlisters, 10) || 0;
    const units = parseInt(lotData.stockUnits, 10) || (boxes * parseInt(prod.units_per_box, 10));

    const newLot = await getFn(`
      INSERT INTO lotes_fefo (
        product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'good')
      RETURNING *, TO_CHAR(expire_date, 'YYYY-MM-DD') AS expire_date;
    `, [validId, cleanLotNumber, lotData.expireDate, boxes, blisters, units]);

    if (units > 0) {
      await runFn(`
        INSERT INTO kardex (
          product_id, lot_id, movement_type, reference_type, reference_id,
          quantity, unit_type, previous_stock, new_stock, reason, user_name
        ) VALUES ($1, $2, 'adjustment_in', 'LOTE_NUEVO', $3, $4, 'unit', 0, $4, 'Alta de nuevo lote', 'Sistema')
      `, [validId, newLot.id, `LOT-${newLot.id}`, units]);
    }

    return { newLot, productName: prod.name };
  }
}

module.exports = ProductModel;
