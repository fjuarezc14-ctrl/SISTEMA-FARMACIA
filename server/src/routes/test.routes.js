const express = require('express');
const { getTestProducts, getTestUsers, getTestStats } = require('../controllers/test.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// Endpoints internos de diagnóstico técnico (Protegidos contra accesos no autorizados)
router.get('/products', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getTestProducts);
router.get('/users', authenticateToken, requireRoles('admin'), getTestUsers);
router.get('/stats', authenticateToken, requireRoles('admin'), getTestStats);

module.exports = router;
