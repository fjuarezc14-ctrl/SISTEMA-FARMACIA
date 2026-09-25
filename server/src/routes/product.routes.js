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
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getAllProducts);
router.get('/lots/expiring', authenticateToken, requireRoles('qf', 'admin'), getExpiringLots);
router.post('/adjust-stock', authenticateToken, requireRoles('qf', 'admin'), adjustStock);
router.post('/receive', authenticateToken, requireRoles('qf', 'admin'), addStock);
router.post('/', authenticateToken, requireRoles('qf', 'admin'), createProduct);
router.get('/:id', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getProductById);
router.put('/:id', authenticateToken, requireRoles('qf', 'admin'), updateProduct);
router.patch('/:id/toggle', authenticateToken, requireRoles('admin'), toggleProductStatus);
router.post('/:id/lots', authenticateToken, requireRoles('qf', 'admin'), createProductLot);

module.exports = router;

