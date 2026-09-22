const express = require('express');
const {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  reassignLaboratory
} = require('../controllers/laboratory.controller');

const router = express.Router();

router.get('/', getAllLaboratories);
router.post('/', createLaboratory);
router.post('/reassign', reassignLaboratory);
router.put('/:id', updateLaboratory);
router.delete('/:id', deleteLaboratory);

module.exports = router;
