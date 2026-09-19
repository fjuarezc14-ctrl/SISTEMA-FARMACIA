const express = require('express');
const {
  getAllRecipes,
  createRecipe,
  updateRecipeStatus,
  getSanitaryBalance
} = require('../controllers/recipe.controller');

const router = express.Router();

// GET /api/recipes - Listado de recetas foliadas
router.get('/', getAllRecipes);

// POST /api/recipes - Foliar nueva receta médica en Libro Oficial
router.post('/', createRecipe);

// GET /api/recipes/balance - Balance Sanitario oficial DIGEMID
router.get('/balance', getSanitaryBalance);

// PATCH /api/recipes/:folio/status - Transición de estado (retained -> approved -> dispensed)
router.patch('/:folio/status', updateRecipeStatus);

module.exports = router;
