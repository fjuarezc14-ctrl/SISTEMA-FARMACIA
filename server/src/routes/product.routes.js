const express = require('express');
const { getAllProducts, addStock } = require('../controllers/product.controller');

const router = express.Router();

router.get('/', getAllProducts);
router.post('/receive', addStock);

module.exports = router;
