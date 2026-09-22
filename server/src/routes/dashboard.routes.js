const express = require('express');
const { getKpis, getSalesChart, getTopProducts } = require('../controllers/dashboard.controller');

const router = express.Router();

// GET /api/dashboard/kpis - Métricas financieras, rotación y saldos
router.get('/kpis', getKpis);

// GET /api/dashboard/sales-chart - Gráfico cronológico de ventas (diario y por horas)
router.get('/sales-chart', getSalesChart);

// GET /api/dashboard/top-products - Ranking de productos más vendidos
router.get('/top-products', getTopProducts);

module.exports = router;
