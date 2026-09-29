const express = require('express');
const { 
  createSale, 
  getSales, 
  getSaleById, 
  cancelSale, 
  getPendingSunat, 
  retrySaleSunat, 
  syncPendingSunat 
} = require('../controllers/sale.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// Registrar venta en mostrador (Cajero y Admin)
router.post('/', authenticateToken, requireRoles('cashier', 'admin'), createSale);

// Consultar historial de ventas con paginación (Cajero, Q.F., Admin)
router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getSales);

// Comprobantes en cola o pendientes de envío a SUNAT (Cajero, Q.F., Admin)
router.get('/sunat/pending', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getPendingSunat);

// Sincronización en lote de comprobantes pendientes con SUNAT (Admin, Q.F.)
router.post('/sunat/sync', authenticateToken, requireRoles('admin', 'qf'), syncPendingSunat);

// Reintentar transmisión manual de un comprobante específico (Admin, Q.F.)
router.post('/:id/sunat/retry', authenticateToken, requireRoles('admin', 'qf'), retrySaleSunat);

// Obtener detalle de venta / ticket térmico
router.get('/:id', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getSaleById);

// Anulación de venta y devolución a Kardex (Estricto: Solo Administrador)
router.patch('/:id/cancel', authenticateToken, requireRoles('admin'), cancelSale);

module.exports = router;
