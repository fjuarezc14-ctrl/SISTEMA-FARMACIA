const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// GET /api/reports/dashboard - Métricas consolidadas financieras y operativas
router.get('/dashboard', reportController.getDashboardMetrics);

module.exports = router;
