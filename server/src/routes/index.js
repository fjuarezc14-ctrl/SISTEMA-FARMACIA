const express = require('express');
const authRoutes = require('./auth.routes');
const saleRoutes = require('./sale.routes');
const healthRoutes = require('./health.routes');
const testRoutes = require('./test.routes');
const productRoutes = require('./product.routes');
const userRoutes = require('./user.routes');
const recipeRoutes = require('./recipe.routes');
const cashRoutes = require('./cash.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sales', saleRoutes);
router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/recipes', recipeRoutes);
router.use('/cash', cashRoutes);
router.use('/test', testRoutes);

module.exports = router;
