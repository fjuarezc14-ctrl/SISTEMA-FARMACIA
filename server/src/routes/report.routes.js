const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// GET /api/reports/dashboard - Métricas consolidadas financieras y operativas
router.get('/dashboard', reportController.getDashboardMetrics);

// MÓDULO 4: Kardex Físico y Valorizado
router.get('/kardex-summary', reportController.getValuedInventorySummary);
router.get('/kardex/:productId', reportController.getProductKardex);

module.exports = router;
