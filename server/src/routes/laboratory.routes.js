const express = require('express');
const {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  reassignLaboratory
} = require('../controllers/laboratory.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { requireRoles } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', authenticateToken, requireRoles('cashier', 'qf', 'admin'), getAllLaboratories);
router.post('/', authenticateToken, requireRoles('qf', 'admin'), createLaboratory);
router.post('/reassign', authenticateToken, requireRoles('qf', 'admin'), reassignLaboratory);
router.put('/:id', authenticateToken, requireRoles('qf', 'admin'), updateLaboratory);
router.delete('/:id', authenticateToken, requireRoles('admin'), deleteLaboratory);

module.exports = router;
