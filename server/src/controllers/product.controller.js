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
        alt.id AS "genericAltId",
        alt.name AS "genericAltName",
        CAST(alt.box_price AS FLOAT) AS "genericAltBoxPrice",
        l.id AS "lotId",
        l.lot_number AS "lotNumber",
        TO_CHAR(l.expire_date, 'YYYY-MM-DD') AS "expireDate",
        l.stock_boxes AS "stockBoxes",
        l.stock_blisters AS "stockBlisters",
        l.stock_units AS "stockUnits",
        l.fefo_status AS "fefoStatus"
      FROM productos p
      JOIN categorias c ON p.category_id = c.id
      LEFT JOIN productos alt ON p.generic_alt_id = alt.id
      LEFT JOIN lotes_fefo l ON p.id = l.product_id
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
      barcode: p.barcode,
      lotNumber: p.lotNumber || 'N/A',
      expireDate: p.expireDate || 'N/A',
      fefoStatus: p.fefoStatus || 'good',
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

module.exports = {
  getAllProducts,
  addStock
};
