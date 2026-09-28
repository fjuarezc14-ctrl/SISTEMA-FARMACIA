const { query } = require('../db');

/**
 * Obtener perfiles y lista de personal desde PostgreSQL
 */
async function getAllUsers(req, res, next) {
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

    // Estructurar perfiles de trabajo rápidos para login
    const profiles = {};
    users.forEach(u => {
      let avatar = 'bi-capsule';
      let allowedViews = ['viewCounter'];
      let defaultView = 'viewCounter';

      if (u.roleKey === 'admin') {
        avatar = 'bi-briefcase';
        allowedViews = ['viewCounter', 'viewCash', 'viewWarehouse', 'viewDigemid', 'viewStaff', 'viewManagement'];
        defaultView = 'viewManagement';
      } else if (u.roleKey === 'qf') {
        avatar = 'bi-file-earmark-medical';
        allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
        defaultView = 'viewDigemid';
      } else if (u.roleKey === 'cashier') {
        avatar = 'bi-cash-stack';
        allowedViews = ['viewCounter', 'viewCash'];
        defaultView = 'viewCash';
      } else if (u.roleKey === 'tech') {
        avatar = 'bi-capsule';
        allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
        defaultView = 'viewCounter';
      }

      profiles[u.roleKey] = {
        name: u.name,
        roleLabel: u.roleLabel,
        avatar,
        email: u.email,
        allowedViews,
        defaultView
      };
    });

    res.status(200).json({
      success: true,
      count: users.length,
      source: 'PostgreSQL 16',
      data: {
        profiles,
        staffList: users
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers
};
