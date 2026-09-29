const UserModel = require('../models/user.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: USER (PERSONAL, EMPLEADOS Y ROLES)
 * ============================================================================
 * Orquesta la obtención y perfiles del personal de la botica para administración.
 * Las consultas y el acceso seguro a usuarios residen en UserModel.
 */

/**
 * GET /api/users
 * Obtener perfiles y lista de personal desde PostgreSQL (Solo Administrador)
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await UserModel.getAllWithRoles();

    // Estructurar perfiles de trabajo rápidos para login
    const profiles = {};
    users.forEach(u => {
      let avatar = '🩺';
      let allowedViews = ['viewCounter'];
      let defaultView = 'viewCounter';

      if (u.roleKey === 'admin') {
        avatar = '👑';
        allowedViews = ['viewCounter', 'viewCash', 'viewWarehouse', 'viewDigemid', 'viewStaff', 'viewManagement'];
        defaultView = 'viewManagement';
      } else if (u.roleKey === 'qf') {
        avatar = '🔬';
        allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
        defaultView = 'viewDigemid';
      } else if (u.roleKey === 'cashier') {
        avatar = '💵';
        allowedViews = ['viewCounter', 'viewCash'];
        defaultView = 'viewCash';
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
