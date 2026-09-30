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
