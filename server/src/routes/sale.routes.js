const express = require('express');
const { createSale, getSales, getSaleById, cancelSale } = require('../controllers/sale.controller');

const router = express.Router();

router.post('/', createSale);
router.get('/', getSales);
router.get('/:id', getSaleById);
router.patch('/:id/cancel', cancelSale);

module.exports = router;
