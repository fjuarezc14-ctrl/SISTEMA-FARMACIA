const express = require('express');
const { getAllUsers } = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// Listado de usuarios del sistema (Estricto: Solo Administrador)
router.get('/', authenticateToken, requireRoles('admin'), getAllUsers);

module.exports = router;
