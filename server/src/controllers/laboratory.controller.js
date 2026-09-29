const LaboratoryModel = require('../models/laboratory.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: LABORATORY (LABORATORIOS Y FABRICANTES)
 * ============================================================================
 * Orquesta la gestión del catálogo de laboratorios proveedores de medicamentos.
 * Toda la interacción SQL, validaciones de unicidad y sincronización residen en LaboratoryModel.
 */

/**
 * GET /api/laboratories
 * Listar todos los laboratorios con conteo de medicamentos asociados
 */
async function getAllLaboratories(req, res, next) {
  try {
    const labs = await LaboratoryModel.getAllWithProductCount();

    res.status(200).json({
      success: true,
      data: labs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/laboratories
 * Registrar nuevo laboratorio farmacéutico
 */
async function createLaboratory(req, res, next) {
  try {
    const inserted = await LaboratoryModel.create(req.body);

    res.status(201).json({
      success: true,
      message: `Laboratorio "${inserted.name}" registrado con éxito.`,
      data: inserted
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * PUT /api/laboratories/:id
 * Actualizar laboratorio y propagar cambios de nombre a productos vinculados
 */
async function updateLaboratory(req, res, next) {
  try {
    const updated = await LaboratoryModel.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Laboratorio actualizado correctamente.',
      data: updated
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * DELETE /api/laboratories/:id
 * Eliminar laboratorio con validación referencial de medicamentos
 */
async function deleteLaboratory(req, res, next) {
  try {
    const lab = await LaboratoryModel.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Laboratorio "${lab.name}" eliminado correctamente.`
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * POST /api/laboratories/reassign
 * Reasignar medicamentos masivamente de un laboratorio a otro
 */
async function reassignLaboratory(req, res, next) {
  try {
    const { sourceLabName, targetLabName } = req.body;
    const result = await LaboratoryModel.reassignProducts(sourceLabName, targetLabName);

    res.status(200).json({
      success: true,
      message: `Se reasignaron ${result.reassignedCount} medicamentos de "${sourceLabName}" hacia "${targetLabName}".`,
      reassignedCount: result.reassignedCount
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

module.exports = {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  reassignLaboratory
};
