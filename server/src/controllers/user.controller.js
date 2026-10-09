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

const ROLE_MAP = {
  admin: 1,
  qf: 2,
  tech: 3,
  cashier: 4
};

const PERM_LABELS = {
  admin: "Control Total, Finanzas, Compras",
  qf: "Auditoría, DIGEMID, Lotes",
  tech: "Dispensación, Consulta Stock",
  cashier: "Cobro POS, Arqueo, Egresos"
};

/**
 * POST /api/users
 * Crear y registrar un nuevo colaborador en la base de datos PostgreSQL
 */
async function createUser(req, res, next) {
  try {
    const { name, dni, roleKey, roleId, target, status = 'active', email, password } = req.body;

    const resolvedRoleId = roleId ? parseInt(roleId, 10) : (ROLE_MAP[roleKey] || 3);
    const cleanDni = dni ? String(dni).trim().replace(/\D/g, '') : '';
    const cleanName = name ? String(name).trim() : '';

    if (!cleanName || cleanName.length < 3) {
      const err = new Error('El nombre completo es obligatorio y debe tener al menos 3 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    if (!cleanDni || cleanDni.length !== 8) {
      const err = new Error('El DNI debe contener exactamente 8 dígitos numéricos.');
      err.statusCode = 400;
      throw err;
    }

    const finalEmail = email ? String(email).trim().toLowerCase() : `${cleanDni}@valetec.pe`;
    const finalPassword = password ? String(password) : `${cleanDni}`;
    const permissions = PERM_LABELS[roleKey] || 'Atención y Consulta';

    const newUser = await UserModel.create({
      roleId: resolvedRoleId,
      name: cleanName,
      email: finalEmail,
      dni: cleanDni,
      password: finalPassword,
      permissions,
      target: target ? String(target).trim() : 'S/ 1,500.00',
      status
    });

    res.status(201).json({
      success: true,
      message: `Colaborador ${cleanName} registrado permanentemente en PostgreSQL.`,
      data: newUser
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  createUser
};
