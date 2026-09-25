const { query, get, run, transaction } = require('../db');

/**
 * Obtener todos los productos con categorías y lotes FEFO desde PostgreSQL
 */
async function getAllProducts(req, res, next) {
  try {
    const products = await query(`
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
        COALESCE(fefo.fefo_status, 'good') AS "fefoStatus",
        COALESCE(tot.lots_json, '[]'::json) AS "lots"
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      LEFT JOIN productos alt ON p.generic_alt_id = alt.id
      LEFT JOIN LATERAL (
        SELECT 
          SUM(stock_boxes) AS total_boxes,
          SUM(stock_blisters) AS total_blisters,
          SUM(stock_units) AS total_units,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', l.id,
              'lotNumber', l.lot_number,
              'expireDate', TO_CHAR(l.expire_date, 'YYYY-MM-DD'),
              'stockBoxes', l.stock_boxes,
              'stockBlisters', l.stock_blisters,
              'stockUnits', l.stock_units,
              'fefoStatus', l.fefo_status
            ) ORDER BY l.expire_date ASC
          ) AS lots_json
        FROM lotes_fefo l
        WHERE l.product_id = p.id
      ) tot ON true
      LEFT JOIN LATERAL (
        SELECT id, lot_number, expire_date, fefo_status
        FROM lotes_fefo
        WHERE product_id = p.id AND stock_units > 0
        ORDER BY expire_date ASC, id ASC
        LIMIT 1
      ) fefo ON true
      ORDER BY p.id ASC;
    `);

    // Formatear al modelo consumido por el frontend
    const formatted = products.map(p => ({
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
      stockBoxes: p.stockBoxes || 0,
      stockBlisters: p.stockBlisters || 0,
      stockUnits: p.stockUnits || 0,
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
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      source: 'PostgreSQL 16',
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener un producto por ID con sus datos detallados
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const prod = await get(`
      SELECT 
        p.*, 
        c.name AS category_name, 
        c.slug AS category_slug,
        l.lot_number,
        TO_CHAR(l.expire_date, 'YYYY-MM-DD') AS expire_date,
        l.stock_boxes,
        l.stock_blisters,
        l.stock_units
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      LEFT JOIN lotes_fefo l ON p.id = l.product_id
      WHERE p.id = $1
    `, [id]);

    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Medicamento con ID #${id} no encontrado.`
      });
    }

    res.status(200).json({
      success: true,
      data: prod
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Crear un nuevo medicamento en el catálogo maestro (Fase A - Módulo 1)
 */
async function createProduct(req, res, next) {
  try {
    const {
      barcode,
      name,
      genericDci,
      laboratory,
      categoryId,
      location = 'Pasillo 1 • Anaquel A-1',
      boxPrice,
      blisterPrice,
      unitPrice,
      unitsPerBox = 100,
      unitsPerBlister = 10,
      prescriptionType = 'free',
      sanitaryRegistry = '',
      initialBoxes = 0,
      lotNumber = '',
      expireDate = '2028-12-31'
    } = req.body;

    // 1. Validaciones sanitarias y de negocio
    if (!name || !genericDci || !laboratory || !boxPrice || !blisterPrice || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: Nombre, DCI, Laboratorio y Precios son requeridos.'
      });
    }

    const cleanBarcode = barcode && barcode.trim() !== '' 
      ? barcode.trim() 
      : `775${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 2. Comprobar que el código de barras no esté duplicado
    const existing = await get('SELECT id, name FROM productos WHERE barcode = $1', [cleanBarcode]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `El código de barras ${cleanBarcode} ya está asignado a "${existing.name}".`
      });
    }

    // 3. Validar categoría existente o fallback a 1
    const validCatId = parseInt(categoryId, 10) || 1;

    // 4. Inserción atómica en PostgreSQL
    const result = await transaction(async ({ run, get }) => {
      const inserted = await get(`
        INSERT INTO productos (
          barcode, name, generic_dci, laboratory, category_id, location,
          box_price, blister_price, unit_price, units_per_box, units_per_blister,
          prescription_type, sanitary_registry, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
        RETURNING *;
      `, [
        cleanBarcode,
        name.trim(),
        genericDci.trim(),
        laboratory.trim(),
        validCatId,
        location.trim(),
        parseFloat(boxPrice),
        parseFloat(blisterPrice),
        parseFloat(unitPrice),
        parseInt(unitsPerBox, 10) || 100,
        parseInt(unitsPerBlister, 10) || 10,
        prescriptionType,
        sanitaryRegistry.trim()
      ]);

      // Si se especificó stock inicial, crear el lote FEFO
      const initBoxes = parseInt(initialBoxes, 10) || 0;
      if (initBoxes > 0) {
        const uPerBox = parseInt(unitsPerBox, 10) || 100;
        const uPerBlister = parseInt(unitsPerBlister, 10) || 10;
        const totalUnits = initBoxes * uPerBox;
        const totalBlisters = initBoxes * (uPerBox / uPerBlister);
        const lot = lotNumber.trim() || `L-${Math.floor(10000 + Math.random() * 90000)}`;

        await run(`
          INSERT INTO lotes_fefo (
            product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'good');
        `, [inserted.id, lot, expireDate, initBoxes, totalBlisters, totalUnits]);
      }

      return inserted;
    });

    res.status(201).json({
      success: true,
      message: `Medicamento "${result.name}" creado exitosamente en el catálogo maestro.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Modificar un medicamento existente
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      barcode,
      name,
      genericDci,
      laboratory,
      categoryId,
      location,
      boxPrice,
      blisterPrice,
      unitPrice,
      unitsPerBox,
      unitsPerBlister,
      prescriptionType,
      sanitaryRegistry
    } = req.body;

    const prod = await get('SELECT id FROM productos WHERE id = $1', [id]);
    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Medicamento #${id} no encontrado para actualizar.`
      });
    }

    if (barcode) {
      const dup = await get('SELECT id FROM productos WHERE barcode = $1 AND id != $2', [barcode.trim(), id]);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `El código de barras ${barcode} ya está siendo utilizado por otro producto.`
        });
      }
    }

    const updated = await get(`
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
        sanitary_registry = COALESCE($13, sanitary_registry)
      WHERE id = $14
      RETURNING *;
    `, [
      barcode ? barcode.trim() : null,
      name ? name.trim() : null,
      genericDci ? genericDci.trim() : null,
      laboratory ? laboratory.trim() : null,
      categoryId ? parseInt(categoryId, 10) : null,
      location ? location.trim() : null,
      boxPrice ? parseFloat(boxPrice) : null,
      blisterPrice ? parseFloat(blisterPrice) : null,
      unitPrice ? parseFloat(unitPrice) : null,
      unitsPerBox ? parseInt(unitsPerBox, 10) : null,
      unitsPerBlister ? parseInt(unitsPerBlister, 10) : null,
      prescriptionType || null,
      sanitaryRegistry ? sanitaryRegistry.trim() : null,
      id
    ]);

    res.status(200).json({
      success: true,
      message: `Medicamento "${updated.name}" actualizado correctamente.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Alternar estado Activo / Inactivo de un medicamento
 */
async function toggleProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const prod = await get('SELECT id, name, status FROM productos WHERE id = $1', [id]);
    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Medicamento #${id} no encontrado.`
      });
    }

    const newStatus = prod.status === 'inactive' ? 'active' : 'inactive';
    await run('UPDATE productos SET status = $1 WHERE id = $2', [newStatus, id]);

    res.status(200).json({
      success: true,
      message: `Estado de "${prod.name}" cambiado a ${newStatus === 'active' ? '🟢 Activo' : '🔴 Inactivo'}.`,
      status: newStatus
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Ingreso de mercadería / Lote al Kardex
 */
async function addStock(req, res, next) {
  try {
    const { productId, lotNumber, expireDate, boxes, location } = req.body;

    if (!productId || !boxes || boxes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: productId y boxes son requeridos.'
      });
    }

    const result = await transaction(async ({ run, get }) => {
      const prod = await get('SELECT * FROM productos WHERE id = $1', [productId]);
      if (!prod) {
        throw new Error('Producto no encontrado');
      }

      const totalUnits = parseInt(boxes, 10) * parseInt(prod.units_per_box, 10);
      const totalBlisters = parseInt(boxes, 10) * (parseInt(prod.units_per_box, 10) / parseInt(prod.units_per_blister, 10));

      // Actualizar ubicación si fue enviada
      if (location) {
        await run('UPDATE productos SET location = $1 WHERE id = $2', [location, productId]);
      }

      // Buscar si el lote ya existe o crear nuevo
      let lot = await get('SELECT id FROM lotes_fefo WHERE product_id = $1 AND lot_number = $2', [productId, lotNumber]);
      if (lot) {
        await run(
          `UPDATE lotes_fefo 
           SET stock_boxes = stock_boxes + $1,
               stock_blisters = stock_blisters + $2,
               stock_units = stock_units + $3,
               expire_date = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [boxes, totalBlisters, totalUnits, expireDate, lot.id]
        );
      } else {
        await run(
          `INSERT INTO lotes_fefo (product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'good')`,
          [productId, lotNumber || `L-${Math.floor(10000 + Math.random() * 90000)}`, expireDate || '2028-12-31', boxes, totalBlisters, totalUnits]
        );
      }

      return {
        productName: prod.name,
        boxesAdded: boxes,
        unitsAdded: totalUnits
      };
    });

    res.status(201).json({
      success: true,
      message: 'Mercadería ingresada al Kardex con éxito en PostgreSQL',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * MÓDULO 3: Ajuste manual de stock, bajas por merma/rotura/vencimiento
 */
async function adjustStock(req, res, next) {
  try {
    const { productId, lotId, adjustmentType, quantity, unitType, reason, userName } = req.body;

    if (!productId || !adjustmentType || quantity === undefined || quantity === null || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros obligatorios: productId, adjustmentType, quantity y motivo (reason) detallado.'
      });
    }

    if (!reason.trim() || reason.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar un motivo o justificación clara del ajuste (mínimo 4 caracteres).'
      });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad a ajustar debe ser un número entero mayor a 0.'
      });
    }

    const type = unitType || 'unit';
    const opType = ['spoilage', 'expired', 'breakage', 'loss', 'diff_out'].includes(adjustmentType) ? 'OUT' : 'IN';

    const result = await transaction(async ({ run, get }) => {
      const prod = await get('SELECT * FROM productos WHERE id = $1', [productId]);
      if (!prod) {
        throw new Error(`Producto #${productId} no encontrado.`);
      }

      let targetLot = null;
      if (lotId) {
        targetLot = await get('SELECT * FROM lotes_fefo WHERE id = $1 AND product_id = $2', [lotId, productId]);
      } else {
        targetLot = await get('SELECT * FROM lotes_fefo WHERE product_id = $1 ORDER BY expire_date ASC LIMIT 1', [productId]);
      }

      if (!targetLot) {
        throw new Error(`No hay lotes disponibles para el producto "${prod.name}". Registre un lote primero.`);
      }

      let deltaUnits = qty;
      let deltaBoxes = 0;
      let deltaBlisters = 0;

      if (type === 'box') {
        deltaBoxes = qty;
        deltaUnits = qty * parseInt(prod.units_per_box, 10);
        deltaBlisters = qty * Math.floor(parseInt(prod.units_per_box, 10) / parseInt(prod.units_per_blister, 10));
      } else if (type === 'blister') {
        deltaBlisters = qty;
        deltaUnits = qty * parseInt(prod.units_per_blister, 10);
        deltaBoxes = Math.floor(deltaUnits / parseInt(prod.units_per_box, 10));
      } else {
        deltaUnits = qty;
        deltaBoxes = Math.floor(deltaUnits / parseInt(prod.units_per_box, 10));
        deltaBlisters = Math.floor(deltaUnits / parseInt(prod.units_per_blister, 10));
      }

      const prevUnits = parseInt(targetLot.stock_units, 10);
      let newUnits = prevUnits;

      if (opType === 'OUT') {
        if (prevUnits < deltaUnits) {
          throw new Error(`Stock insuficiente en el lote ${targetLot.lot_number}. Stock actual: ${prevUnits} unid., solicitado para baja: ${deltaUnits} unid.`);
        }
        newUnits = prevUnits - deltaUnits;
      } else {
        newUnits = prevUnits + deltaUnits;
      }

      const newBoxes = Math.floor(newUnits / parseInt(prod.units_per_box, 10));
      const newBlisters = Math.floor(newUnits / parseInt(prod.units_per_blister, 10));

      await run(`
        UPDATE lotes_fefo 
        SET stock_boxes = $1, stock_blisters = $2, stock_units = $3, updated_at = NOW()
        WHERE id = $4
      `, [newBoxes, newBlisters, newUnits, targetLot.id]);

      const refCode = `AJ-${Date.now().toString().slice(-6)}`;
      const movementType = opType === 'OUT' ? 'adjustment_out' : 'adjustment_in';

      await run(`
        INSERT INTO kardex (
          product_id, lot_id, movement_type, reference_type, reference_id,
          quantity, unit_type, previous_stock, new_stock, reason, user_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        productId,
        targetLot.id,
        movementType,
        adjustmentType.toUpperCase(),
        refCode,
        opType === 'OUT' ? -deltaUnits : deltaUnits,
        type,
        prevUnits,
        newUnits,
        reason.trim(),
        userName || 'Operador Almacén'
      ]);

      return {
        productName: prod.name,
        lotNumber: targetLot.lot_number,
        opType,
        adjustedUnits: deltaUnits,
        previousStockUnits: prevUnits,
        newStockUnits: newUnits,
        refCode
      };
    });

    res.status(200).json({
      success: true,
      message: `Ajuste (${result.opType === 'OUT' ? 'Baja/Merma' : 'Ingreso'}) de ${result.adjustedUnits} unidades aplicado a "${result.productName}" [Lote: ${result.lotNumber}].`,
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
}

/**
 * MÓDULO 3: Alertas FEFO y Lotes próximos a vencer
 */
async function getExpiringLots(req, res, next) {
  try {
    const lots = await query(`
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

    const summary = {
      expired: lots.filter(l => l.fefoAlert === 'expired').length,
      critical: lots.filter(l => l.fefoAlert === 'critical').length,
      warning: lots.filter(l => l.fefoAlert === 'warning').length,
      safe: lots.filter(l => l.fefoAlert === 'safe').length,
      total: lots.length
    };

    res.status(200).json({
      success: true,
      summary,
      count: lots.length,
      data: lots
    });
  } catch (err) {
    next(err);
  }
}

/**
 * MÓDULO 3: Crear nuevo lote para un fármaco existente
 */
async function createProductLot(req, res, next) {
  try {
    const { id } = req.params;
    const { lotNumber, expireDate, stockBoxes, stockBlisters, stockUnits } = req.body;

    if (!lotNumber || !expireDate) {
      return res.status(400).json({
        success: false,
        message: 'El número de lote y la fecha de vencimiento son requeridos.'
      });
    }

    const prod = await get('SELECT * FROM productos WHERE id = $1', [id]);
    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Medicamento #${id} no encontrado.`
      });
    }

    const dup = await get('SELECT id FROM lotes_fefo WHERE product_id = $1 AND lot_number = $2', [id, lotNumber.trim()]);
    if (dup) {
      return res.status(409).json({
        success: false,
        message: `El lote "${lotNumber}" ya existe para este medicamento.`
      });
    }

    const boxes = parseInt(stockBoxes, 10) || 0;
    const blisters = parseInt(stockBlisters, 10) || 0;
    const units = parseInt(stockUnits, 10) || (boxes * parseInt(prod.units_per_box, 10));

    const newLot = await get(`
      INSERT INTO lotes_fefo (
        product_id, lot_number, expire_date, stock_boxes, stock_blisters, stock_units, fefo_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'good')
      RETURNING *, TO_CHAR(expire_date, 'YYYY-MM-DD') AS expire_date;
    `, [id, lotNumber.trim(), expireDate, boxes, blisters, units]);

    if (units > 0) {
      await run(`
        INSERT INTO kardex (
          product_id, lot_id, movement_type, reference_type, reference_id,
          quantity, unit_type, previous_stock, new_stock, reason, user_name
        ) VALUES ($1, $2, 'adjustment_in', 'LOTE_NUEVO', $3, $4, 'box', 0, $4, 'Alta de nuevo lote', 'Sistema')
      `, [id, newLot.id, `LOT-${newLot.id}`, units]);
    }

    res.status(201).json({
      success: true,
      message: `Lote "${lotNumber}" registrado exitosamente para "${prod.name}".`,
      data: newLot
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  addStock,
  adjustStock,
  getExpiringLots,
  createProductLot
};
