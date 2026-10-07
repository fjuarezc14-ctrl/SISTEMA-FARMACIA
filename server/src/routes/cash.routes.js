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

// GET /api/cash/history - Obtener historial de cierres Z oficiales
router.get('/history', authenticateToken, requireRoles('cashier', 'admin'), cashController.getShiftHistory);

// GET /api/cash/terminals - Listado de cajas registradoras para apertura de turno
router.get('/terminals', authenticateToken, cashController.getTerminals);

// POST /api/cash/terminals - Registrar nueva caja registradora (Solo Admin)
router.post('/terminals', authenticateToken, requireRoles('admin'), cashController.createTerminal);

// PUT /api/cash/terminals/:id - Actualizar nombre o descripción de caja registradora (Solo Admin)
router.put('/terminals/:id', authenticateToken, requireRoles('admin'), cashController.updateTerminal);

// PATCH /api/cash/terminals/:id/status - Alternar estado activa/inactiva (Solo Admin)
router.patch('/terminals/:id/status', authenticateToken, requireRoles('admin'), cashController.toggleTerminalStatus);

// DELETE /api/cash/terminals/:id - Eliminar caja registradora sin historial (Solo Admin)
router.delete('/terminals/:id', authenticateToken, requireRoles('admin'), cashController.deleteTerminal);

module.exports = router;
