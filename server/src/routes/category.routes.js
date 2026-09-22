const express = require('express');
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategory
} = require('../controllers/category.controller');

const router = express.Router();

router.get('/', getAllCategories);
router.post('/', createCategory);
router.post('/reassign', reassignCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
