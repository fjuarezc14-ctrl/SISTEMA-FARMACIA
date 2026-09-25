const express = require('express');
const { getKpis, getSalesChart, getTopProducts } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// GET /api/dashboard/kpis - Métricas financieras, rotación y saldos (Estricto: Solo Admin)
router.get('/kpis', authenticateToken, requireRoles('admin'), getKpis);

// GET /api/dashboard/sales-chart - Gráfico cronológico de ventas (Estricto: Solo Admin)
router.get('/sales-chart', authenticateToken, requireRoles('admin'), getSalesChart);

// GET /api/dashboard/top-products - Ranking de productos más vendidos (Estricto: Solo Admin)
router.get('/top-products', authenticateToken, requireRoles('admin'), getTopProducts);

module.exports = router;
