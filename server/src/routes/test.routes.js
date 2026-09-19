const express = require('express');
const { getTestProducts, getTestUsers, getTestStats } = require('../controllers/test.controller');

const router = express.Router();

router.get('/products', getTestProducts);
router.get('/users', getTestUsers);
router.get('/stats', getTestStats);

module.exports = router;
