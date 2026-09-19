const { query, get } = require('../db');

async function getTestProducts(req, res, next) {
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
        alt.name AS "genericAltName",
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

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    next(err);
  }
}

async function getTestUsers(req, res, next) {
  try {
    const users = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name AS "roleKey",
        r.label AS "roleLabel",
        u.terminal,
        u.shift,
        u.permissions,
        u.target,
        u.status,
        u.created_at AS "createdAt"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC;
    `);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

async function getTestStats(req, res, next) {
  try {
    const totalProducts = await get('SELECT COUNT(*) AS count FROM productos');
    const totalLots = await get('SELECT COUNT(*) AS count FROM lotes_fefo');
    const totalUsers = await get('SELECT COUNT(*) AS count FROM usuarios');
    const totalRoles = await get('SELECT COUNT(*) AS count FROM roles');
    const totalCategories = await get('SELECT COUNT(*) AS count FROM categorias');
    const totalDigemid = await get('SELECT COUNT(*) AS count FROM recetas_digemid');
    const activeShift = await get("SELECT * FROM caja_turnos WHERE status = 'open' LIMIT 1");

    res.status(200).json({
      success: true,
      databaseEngine: 'PostgreSQL 16',
      stats: {
        totalProducts: parseInt(totalProducts.count, 10),
        totalLots: parseInt(totalLots.count, 10),
        totalUsers: parseInt(totalUsers.count, 10),
        totalRoles: parseInt(totalRoles.count, 10),
        totalCategories: parseInt(totalCategories.count, 10),
        totalDigemid: parseInt(totalDigemid.count, 10),
        activeCashShift: activeShift ? {
          id: activeShift.id,
          terminal: activeShift.terminal,
          openingBalance: parseFloat(activeShift.opening_balance),
          expectedBalance: parseFloat(activeShift.expected_balance),
          status: activeShift.status
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTestProducts,
  getTestUsers,
  getTestStats
};
