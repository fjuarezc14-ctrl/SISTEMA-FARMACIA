const { query, run } = require('../db');

/**
 * Obtener recetas médicas DIGEMID desde PostgreSQL
 */
async function getAllRecipes(req, res, next) {
  try {
    const recipes = await query(`
      SELECT 
        id,
        folio,
        patient_name AS "patientName",
        patient_dni AS "patientDni",
        doctor_name AS "doctorName",
        doctor_cmp AS "doctorCmp",
        medication_details AS "medication",
        date_issued AS "dateIssued",
        status,
        notes
      FROM recetas_digemid
      ORDER BY id DESC;
    `);

    res.status(200).json({
      success: true,
      count: recipes.length,
      source: 'PostgreSQL 16',
      data: recipes
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar estado de una receta (ej: aprobar, dispensar)
 */
async function updateRecipeStatus(req, res, next) {
  try {
    const { folio } = req.params;
    const { status } = req.body;

    if (!['retained', 'approved', 'dispensed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: retained, approved o dispensed.'
      });
    }

    const updateRes = await run(
      'UPDATE recetas_digemid SET status = $1 WHERE folio = $2',
      [status, folio]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Receta con folio ${folio} no encontrada.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Receta ${folio} actualizada a estado ${status} en PostgreSQL.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRecipes,
  updateRecipeStatus
};
