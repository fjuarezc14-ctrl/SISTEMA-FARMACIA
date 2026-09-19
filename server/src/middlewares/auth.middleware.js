const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware para autenticar tokens JWT
 * Verifica la firma en el encabezado Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Acceso no autorizado: Token de sesión no proporcionado.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    let message = 'Token inválido o manipulado.';
    if (err.name === 'TokenExpiredError') {
      message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    }

    return res.status(401).json({
      success: false,
      statusCode: 401,
      message
    });
  }
}

module.exports = {
  authenticateToken
};
