const express = require('express');
const {
  getAllRecipes,
  createRecipe,
  updateRecipeStatus,
  getSanitaryBalance
} = require('../controllers/recipe.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

// GET /api/recipes - Listado de recetas foliadas
router.get('/', authenticateToken, requireRoles('qf', 'admin'), getAllRecipes);

// POST /api/recipes - Foliar nueva receta médica en Libro Oficial
router.post('/', authenticateToken, requireRoles('qf', 'admin'), createRecipe);

// GET /api/recipes/balance - Balance Sanitario oficial DIGEMID
router.get('/balance', authenticateToken, requireRoles('qf', 'admin'), getSanitaryBalance);

// PATCH /api/recipes/:folio/status - Transición de estado (retained -> approved -> dispensed)
router.patch('/:folio/status', authenticateToken, requireRoles('qf', 'admin'), updateRecipeStatus);

module.exports = router;
