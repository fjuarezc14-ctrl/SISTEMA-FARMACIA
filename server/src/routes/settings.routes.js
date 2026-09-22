const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// GET /api/settings - Parámetros públicos de la botica (RUC, Razón Social, IGV, Moneda)
router.get('/', getSettings);

// PUT /api/settings - Actualización administrativa protegida (SOLO ROL ADMIN)
router.put('/', authenticateToken, requireRoles('admin'), updateSettings);

module.exports = router;
