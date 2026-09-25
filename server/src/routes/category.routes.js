const express = require('express');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategory
} = require('../controllers/category.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getAllCategories);
router.post('/', authenticateToken, requireRoles('qf', 'admin'), createCategory);
router.post('/reassign', authenticateToken, requireRoles('qf', 'admin'), reassignCategory);
router.put('/:id', authenticateToken, requireRoles('qf', 'admin'), updateCategory);
router.delete('/:id', authenticateToken, requireRoles('admin'), deleteCategory);

module.exports = router;
