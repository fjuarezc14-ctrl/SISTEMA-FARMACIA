const CategoryModel = require('../models/category.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: CATEGORY (CATEGORÍAS FARMACÉUTICAS)
 * ============================================================================
 * Orquesta la administración de familias y categorías de medicamentos.
 * Toda la interacción SQL, unicidad de slugs e integridad residen en CategoryModel.
 */

/**
 * GET /api/categories
 * Listar todas las categorías con conteo de medicamentos asociados
 */
async function getAllCategories(req, res, next) {
  try {
    const categories = await CategoryModel.getAllWithProductCount();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/categories
 * Crear nueva categoría con slug autogenerado y validación de unicidad
 */
async function createCategory(req, res, next) {
  try {
    const inserted = await CategoryModel.create(req.body);

    res.status(201).json({
      success: true,
      message: `Categoría "${inserted.name}" creada exitosamente.`,
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
 * PUT /api/categories/:id
 * Actualizar nombre o icono de una categoría existente
 */
async function updateCategory(req, res, next) {
  try {
    const updated = await CategoryModel.update(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Categoría actualizada correctamente.',
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
 * DELETE /api/categories/:id
 * Eliminar categoría con validación estricta de productos asociados
 */
async function deleteCategory(req, res, next) {
  try {
    await CategoryModel.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Categoría eliminada correctamente.'
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
 * POST /api/categories/reassign
 * Reasignar productos masivamente de una categoría a otra
 */
async function reassignCategory(req, res, next) {
  try {
    const { sourceCategoryId, targetCategoryId } = req.body;
    const result = await CategoryModel.reassignProducts(sourceCategoryId, targetCategoryId);

    res.status(200).json({
      success: true,
      message: `Se reasignaron exitosamente ${result.reassignedCount} medicamentos a la nueva categoría.`,
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
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategory
};
