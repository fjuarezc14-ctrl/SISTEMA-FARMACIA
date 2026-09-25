const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cash.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

// GET /api/cash/current - Obtener turno actual con saldo y egresos
router.get('/current', authenticateToken, requireRoles('cashier', 'admin'), cashController.getCurrentShift);

// POST /api/cash/movement - Registrar egreso o gasto menor
router.post('/movement', authenticateToken, requireRoles('cashier', 'admin'), cashController.addMovement);

// POST /api/cash/close-z - Cierre Z oficial de turno y arqueo
router.post('/close-z', authenticateToken, requireRoles('cashier', 'admin'), cashController.closeZ);

// POST /api/cash/open - Abrir nuevo turno de caja
router.post('/open', authenticateToken, requireRoles('cashier', 'admin'), cashController.openShift);

module.exports = router;
