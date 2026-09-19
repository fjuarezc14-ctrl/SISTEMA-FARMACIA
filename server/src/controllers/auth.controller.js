const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { get } = require('../db');

/**
 * Iniciar sesión con validación de contraseña encriptada (bcrypt)
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Por favor, ingresa tu correo y contraseña.'
      });
    }

    // Buscar usuario en PostgreSQL con su rol
    const user = await get(`
      SELECT 
        u.id,
        u.role_id,
        r.name AS "role_name",
        r.label AS "role_label",
        u.name,
        u.email,
        u.password_hash,
        u.terminal,
        u.shift,
        u.permissions,
        u.target,
        u.status
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1;
    `, [email.trim()]);

    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'El correo ingresado no se encuentra registrado en el sistema.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Tu cuenta de colaborador se encuentra inactiva o en espera de aprobación.'
      });
    }

    // Comparar contraseña con el hash de PostgreSQL
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Contraseña incorrecta. Por favor, verifica tus datos.'
      });
    }

    // Definir vistas permitidas según rol
    let allowedViews = ['viewCounter'];
    let defaultView = 'viewCounter';

    if (user.role_name === 'admin') {
      allowedViews = ['viewCounter', 'viewCash', 'viewWarehouse', 'viewDigemid', 'viewStaff', 'viewManagement'];
      defaultView = 'viewManagement';
    } else if (user.role_name === 'qf') {
      allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
      defaultView = 'viewDigemid';
    } else if (user.role_name === 'cashier') {
      allowedViews = ['viewCounter', 'viewCash'];
      defaultView = 'viewCash';
    }

    // Generar token JWT firmado
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: user.role_name,
      roleLabel: user.role_label,
      terminal: user.terminal,
      shift: user.shift,
      allowedViews,
      defaultView
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '12h'
    });

    res.status(200).json({
      success: true,
      message: `¡Bienvenido al turno, ${user.name}!`,
      token,
      user: payload
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Obtener perfil del usuario autenticado actual a partir del token
 */
async function getMe(req, res, next) {
  try {
    const user = await get(`
      SELECT 
        u.id,
        u.role_id,
        r.name AS "role_name",
        r.label AS "role_label",
        u.name,
        u.email,
        u.terminal,
        u.shift,
        u.permissions,
        u.target,
        u.status,
        u.created_at AS "createdAt"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
      LIMIT 1;
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Usuario no encontrado en la base de datos.'
      });
    }

    let allowedViews = ['viewCounter'];
    let defaultView = 'viewCounter';

    if (user.role_name === 'admin') {
      allowedViews = ['viewCounter', 'viewCash', 'viewWarehouse', 'viewDigemid', 'viewStaff', 'viewManagement'];
      defaultView = 'viewManagement';
    } else if (user.role_name === 'qf') {
      allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
      defaultView = 'viewDigemid';
    } else if (user.role_name === 'cashier') {
      allowedViews = ['viewCounter', 'viewCash'];
      defaultView = 'viewCash';
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleKey: user.role_name,
        roleLabel: user.role_label,
        terminal: user.terminal,
        shift: user.shift,
        permissions: user.permissions,
        target: user.target,
        status: user.status,
        allowedViews,
        defaultView
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Cierre de sesión seguro
 */
function logout(req, res) {
  res.status(200).json({
    success: true,
    message: 'Sesión finalizada correctamente.'
  });
}

module.exports = {
  login,
  getMe,
  logout
};
