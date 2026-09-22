const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');

// MÓDULO 5: Clientes y Padrón Fiscal DNI / RUC
router.get('/', clientController.getAllClients);
router.get('/search', clientController.searchClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);

module.exports = router;
