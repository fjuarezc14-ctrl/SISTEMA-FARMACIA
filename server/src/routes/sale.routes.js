const express = require('express');
const { createSale, getSales, getSaleById, cancelSale } = require('../controllers/sale.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// Registrar venta en mostrador (Cajero y Admin)
router.post('/', authenticateToken, requireRoles('cashier', 'admin'), createSale);

// Consultar historial de ventas (Cajero, Q.F., Admin)
router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getSales);

// Obtener detalle de venta / ticket térmico
router.get('/:id', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getSaleById);

// Anulación de venta y devolución a Kardex (Estricto: Solo Administrador)
router.patch('/:id/cancel', authenticateToken, requireRoles('admin'), cancelSale);

module.exports = router;
