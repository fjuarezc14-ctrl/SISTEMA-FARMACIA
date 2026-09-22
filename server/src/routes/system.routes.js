const express = require('express');
const { generateBackup } = require('../controllers/system.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// GET /api/system/backup - Descarga del dump SQL oficial de PostgreSQL 16 (Estrictamente SOLO ADMIN)
router.get('/backup', authenticateToken, requireRoles('admin'), generateBackup);

// POST /api/system/backup - Disparador alternativo seguro para integraciones (SOLO ADMIN)
router.post('/backup', authenticateToken, requireRoles('admin'), generateBackup);

module.exports = router;
