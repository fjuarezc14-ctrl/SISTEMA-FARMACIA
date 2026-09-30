const SettingsModel = require('../models/settings.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: SETTINGS (AJUSTES Y CONFIGURACIÓN FISCAL)
 * ============================================================================
 * Orquesta la lectura y actualización de los parámetros centrales de la botica.
 * Toda la interacción SQL y las validaciones fiscales residen en SettingsModel.
 */

/**
 * GET /api/settings
 * Obtener los parámetros de configuración oficial de la botica
 */
async function getSettings(req, res, next) {
  try {
    const config = await SettingsModel.getSettings();

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: config
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/settings
 * Modificar parámetros de configuración de la empresa (Solo Administrador)
 */
async function updateSettings(req, res, next) {
  try {
    const updated = await SettingsModel.updateSettings(req.body);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Configuraciones de la botica actualizadas correctamente.',
      data: updated
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

module.exports = {
  getSettings,
  updateSettings
};
