const jwt = require('jsonwebtoken');
const config = require('../config/env');
const UserModel = require('../models/user.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: AUTH (AUTENTICACIÓN Y SESIONES JWT)
 * ============================================================================
 * Orquesta el inicio de sesión, validación de credenciales y perfiles de acceso.
 * La búsqueda de usuarios y verificación bcrypt residen en UserModel.
 */

/**
 * Helper para asignar vistas permitidas y vista por defecto según el rol
 */
function getRoleViews(roleKey) {
  let allowedViews = ['viewCounter'];
  let defaultView = 'viewCounter';

  if (roleKey === 'admin') {
    allowedViews = ['viewCounter', 'viewCash', 'viewWarehouse', 'viewDigemid', 'viewStaff', 'viewManagement'];
    defaultView = 'viewManagement';
  } else if (roleKey === 'qf') {
    allowedViews = ['viewCounter', 'viewWarehouse', 'viewDigemid'];
    defaultView = 'viewDigemid';
  } else if (roleKey === 'cashier') {
    allowedViews = ['viewCounter', 'viewCash'];
    defaultView = 'viewCash';
  }

  return { allowedViews, defaultView };
}

/**
 * POST /api/auth/login
 * Iniciar sesión con validación de credenciales encriptadas
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

    // 1. Buscar usuario con su rol y hash mediante el modelo
    const user = await UserModel.findByEmailWithRole(email);

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

    // 2. Comparar contraseña mediante método seguro del modelo
    const passwordMatch = await UserModel.verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Contraseña incorrecta. Por favor, verifica tus datos.'
      });
    }

    const { allowedViews, defaultView } = getRoleViews(user.role_name);

    // 3. Generar token JWT firmado
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
      expiresIn: config.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '12h'
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
 * GET /api/auth/me
 * Obtener perfil del colaborador autenticado a partir del token
 */
async function getMe(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Usuario no encontrado en la base de datos.'
      });
    }

    const { allowedViews, defaultView } = getRoleViews(user.roleKey);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleKey: user.roleKey,
        roleLabel: user.roleLabel,
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
 * POST /api/auth/logout
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
