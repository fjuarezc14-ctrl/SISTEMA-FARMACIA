/**
 * Middleware para Control de Acceso Basado en Roles (RBAC)
 * Uso: requireRoles('admin', 'qf')
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'No autenticado: Se requiere inicio de sesión.'
      });
    }

    const userRole = req.user.roleKey;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: `Acceso denegado: El rol '${req.user.roleLabel || userRole}' no tiene permisos para esta acción.`,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

module.exports = {
  requireRoles
};
