const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

// GET /api/reports/dashboard - Métricas consolidadas financieras y operativas (Solo Admin)
router.get('/dashboard', authenticateToken, requireRoles('admin'), reportController.getDashboardMetrics);

// MÓDULO 4: Kardex Físico y Valorizado (Q.F. y Admin)
router.get('/kardex-summary', authenticateToken, requireRoles('admin', 'qf'), reportController.getValuedInventorySummary);
router.get('/kardex/:productId', authenticateToken, requireRoles('admin', 'qf'), reportController.getProductKardex);

module.exports = router;
