const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

// MÓDULO 5: Clientes y Padrón Fiscal DNI / RUC
router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), clientController.getAllClients);
router.get('/search', authenticateToken, requireRoles('cashier', 'qf', 'admin'), clientController.searchClients);
router.get('/:id', authenticateToken, requireRoles('cashier', 'qf', 'admin'), clientController.getClientById);
router.post('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), clientController.createClient);
router.put('/:id', authenticateToken, requireRoles('cashier', 'qf', 'admin'), clientController.updateClient);

module.exports = router;
