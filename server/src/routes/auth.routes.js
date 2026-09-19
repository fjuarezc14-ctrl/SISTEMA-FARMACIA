const express = require('express');
const { login, getMe, logout } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// Ruta pública de inicio de sesión
router.post('/login', login);

// Rutas protegidas por JWT
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

// Endpoints de prueba para verificación de políticas RBAC
router.get('/check-admin', authenticateToken, requireRoles('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Acceso autorizado al módulo de Gerencia General.',
    user: req.user.name
  });
});

router.get('/check-regencia', authenticateToken, requireRoles('admin', 'qf'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Acceso autorizado a Regencia Sanitaria y Controlados DIGEMID.',
    user: req.user.name
  });
});

module.exports = router;
