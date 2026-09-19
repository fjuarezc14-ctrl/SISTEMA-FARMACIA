const { query, get } = require('../db');

function getTestProducts(req, res, next) {
  try {
    const products = query(`
      SELECT 
        p.id,
        p.barcode,
        p.name,
        p.generic_dci AS genericDci,
        p.laboratory,
        c.name AS categoryName,
        c.slug AS categorySlug,
        p.location,
        p.box_price AS boxPrice,
        p.blister_price AS blisterPrice,
        p.unit_price AS unitPrice,
        p.units_per_box AS unitsPerBox,
        p.units_per_blister AS unitsPerBlister,
        p.prescription_type AS prescriptionType,
        p.generic_saving_percent AS genericSavingPercent,
        alt.name AS genericAltName,
        l.lot_number AS lotNumber,
        l.expire_date AS expireDate,
        l.stock_boxes AS stockBoxes,
        l.stock_blisters AS stockBlisters,
        l.stock_units AS stockUnits,
        l.fefo_status AS fefoStatus
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

function getTestUsers(req, res, next) {
  try {
    const users = query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name AS roleKey,
        r.label AS roleLabel,
        u.terminal,
        u.shift,
        u.permissions,
        u.target,
        u.status,
        u.created_at AS createdAt
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

function getTestStats(req, res, next) {
  try {
    const totalProducts = get('SELECT COUNT(*) AS count FROM productos').count;
    const totalLots = get('SELECT COUNT(*) AS count FROM lotes_fefo').count;
    const totalUsers = get('SELECT COUNT(*) AS count FROM usuarios').count;
    const totalRoles = get('SELECT COUNT(*) AS count FROM roles').count;
    const totalCategories = get('SELECT COUNT(*) AS count FROM categorias').count;
    const totalDigemid = get('SELECT COUNT(*) AS count FROM recetas_digemid').count;
    const activeShift = get("SELECT * FROM caja_turnos WHERE status = 'open' LIMIT 1");

    res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        totalLots,
        totalUsers,
        totalRoles,
        totalCategories,
        totalDigemid,
        activeCashShift: activeShift ? {
          id: activeShift.id,
          terminal: activeShift.terminal,
          openingBalance: activeShift.opening_balance,
          expectedBalance: activeShift.expected_balance,
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
