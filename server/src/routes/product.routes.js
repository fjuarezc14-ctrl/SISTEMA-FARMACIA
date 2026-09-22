const express = require('express');
const { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  toggleProductStatus, 
  addStock,
  adjustStock,
  getExpiringLots,
  createProductLot
} = require('../controllers/product.controller');

const router = express.Router();

router.get('/', getAllProducts);
router.get('/lots/expiring', getExpiringLots);
router.post('/adjust-stock', adjustStock);
router.post('/receive', addStock);
router.post('/', createProduct);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.patch('/:id/toggle', toggleProductStatus);
router.post('/:id/lots', createProductLot);

module.exports = router;

