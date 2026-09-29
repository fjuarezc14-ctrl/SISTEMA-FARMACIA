const RecipeModel = require('../models/recipe.model');
const SettingsModel = require('../models/settings.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: RECIPE (RECETAS MÉDICAS Y DIGEMID)
 * ============================================================================
 * Orquesta la foliación sanitaria, custodia de recetas de psicotrópicos y
 * la generación del Libro Oficial de Controlados para inspecciones de DIGEMID/MINSA.
 */

/**
 * GET /api/recipes
 * Obtener recetas médicas DIGEMID con filtros de estado y búsqueda predictiva
 */
async function getAllRecipes(req, res, next) {
  try {
    const { status, search } = req.query;
    const recipes = await RecipeModel.getAll({ status, search });

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
 * POST /api/recipes
 * Registrar y foliar una nueva receta médica en el Libro Oficial de Controlados
 */
async function createRecipe(req, res, next) {
  try {
    const {
      patientName,
      patientDni,
      doctorName,
      doctorCmp,
      productId,
      medicationDetails,
      dateIssued,
      notes
    } = req.body;

    if (!doctorCmp || doctorCmp.trim().length < 3) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El CMP (Colegio Médico del Perú) del doctor es obligatorio por normativa DIGEMID.'
      });
    }

    // Formatear CMP (asegurar prefijo CMP- si solo ingresan dígitos)
    const formattedCmp = doctorCmp.trim().toUpperCase().startsWith('CMP') 
      ? doctorCmp.trim().toUpperCase() 
      : `CMP-${doctorCmp.trim()}`;

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const finalDate = dateIssued || `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const newRecipe = await RecipeModel.create({
      patientName,
      patientDni,
      doctorName,
      doctorCmp: formattedCmp,
      productId,
      medicationDetails,
      dateIssued: finalDate,
      notes: notes ? notes.trim() : 'Receta archivada en custodia de Regencia Sanitaria Q.F.'
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Receta foliada exitosamente con N° ${newRecipe.folio} en el Libro Oficial DIGEMID.`,
      data: newRecipe
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        statusCode: err.statusCode,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/recipes/:folio/status
 * Actualizar estado de una receta (retained -> approved -> dispensed)
 */
async function updateRecipeStatus(req, res, next) {
  try {
    const { folio } = req.params;
    const { status, notes } = req.body;

    const recipe = await RecipeModel.findByFolio(folio);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Receta con folio ${folio} no encontrada en el Libro Oficial.`
      });
    }

    await RecipeModel.updateStatus(recipe.id, { status, notes });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Receta ${folio} actualizada a estado "${status}" en el Libro Oficial.`
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        statusCode: err.statusCode,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * GET /api/recipes/balance/report
 * Generar Reporte Oficial de Balance Sanitario DIGEMID (Psicotrópicos y Antibióticos)
 */
async function getSanitaryBalance(req, res, next) {
  try {
    // 1. Estadísticas de recetas e inventario en bóveda mediante RecipeModel
    const { stats, controlledStock } = await RecipeModel.getSanitaryBalanceStats();

    // 2. Listado foliado oficial completo
    const records = await RecipeModel.getAll();

    // 4. Parámetros del establecimiento sanitario desde SettingsModel
    const establishment = await SettingsModel.getFiscalConfig();

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        establishment,
        summary: {
          totalLedgerEntries: parseInt(stats.total_records, 10),
          retainedCount: parseInt(stats.retained_count, 10),
          approvedCount: parseInt(stats.approved_count, 10),
          dispensedCount: parseInt(stats.dispensed_count, 10)
        },
        vaultInventory: controlledStock ? {
          productName: controlledStock.name,
          genericDci: controlledStock.generic_dci,
          location: controlledStock.location,
          unitsInVault: parseInt(controlledStock.total_units_in_vault, 10),
          boxesInVault: parseInt(controlledStock.total_boxes, 10)
        } : null,
        records
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRecipes,
  createRecipe,
  updateRecipeStatus,
  getSanitaryBalance
};
