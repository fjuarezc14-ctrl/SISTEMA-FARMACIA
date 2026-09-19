const express = require('express');
const { getAllRecipes, updateRecipeStatus } = require('../controllers/recipe.controller');

const router = express.Router();

router.get('/', getAllRecipes);
router.patch('/:folio/status', updateRecipeStatus);

module.exports = router;
