const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cash.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// GET /api/cash/current - Obtener turno actual con saldo y egresos
router.get('/current', cashController.getCurrentShift);

// POST /api/cash/movement - Registrar egreso o gasto menor
router.post('/movement', cashController.addMovement);

// POST /api/cash/close-z - Cierre Z oficial de turno y arqueo
router.post('/close-z', cashController.closeZ);

// POST /api/cash/open - Abrir nuevo turno de caja
router.post('/open', cashController.openShift);

module.exports = router;
