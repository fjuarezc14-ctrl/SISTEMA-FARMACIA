const express = require('express');
const { getCurrentShift, addMovement } = require('../controllers/cash.controller');

const router = express.Router();

router.get('/current', getCurrentShift);
router.post('/movement', addMovement);

module.exports = router;
