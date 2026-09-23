const express = require('express');
const authRoutes = require('./auth.routes');
const saleRoutes = require('./sale.routes');
const healthRoutes = require('./health.routes');
const testRoutes = require('./test.routes');
const productRoutes = require('./product.routes');
const userRoutes = require('./user.routes');
const recipeRoutes = require('./recipe.routes');
const cashRoutes = require('./cash.routes');
const reportRoutes = require('./report.routes');
const categoryRoutes = require('./category.routes');
const laboratoryRoutes = require('./laboratory.routes');
const clientRoutes = require('./client.routes');
const dashboardRoutes = require('./dashboard.routes');
const settingsRoutes = require('./settings.routes');
const systemRoutes = require('./system.routes');
const webhookRoutes = require('./webhook.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sales', saleRoutes);
router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/recipes', recipeRoutes);
router.use('/cash', cashRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/system', systemRoutes);
router.use('/categories', categoryRoutes);
router.use('/laboratories', laboratoryRoutes);
router.use('/clients', clientRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/test', testRoutes);

module.exports = router;
