/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('🚨 [Error Handler]:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
