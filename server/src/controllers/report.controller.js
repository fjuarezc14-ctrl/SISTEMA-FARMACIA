const ReportModel = require('../models/report.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: REPORT (REPORTES FINANCIEROS Y KARDEX)
 * ============================================================================
 * Orquesta los informes de balance consolidado, Kardex valorizado de medicamentos
 * y métricas de inventario físico en tiempo real delegando 100% en ReportModel.
 */

/**
 * GET /api/reports/dashboard
 * Obtener métricas consolidadas en tiempo real para la Torre de Control (Dashboard Gerencial)
 */
async function getDashboardMetrics(req, res, next) {
  try {
    const data = await ReportModel.getDashboardMetrics();

    res.status(200).json({
      success: true,
      statusCode: 200,
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/kardex/:productId
 * Kardex Físico y Valorizado de un Medicamento
 */
async function getProductKardex(req, res, next) {
  try {
    const { productId } = req.params;
    const kardexData = await ReportModel.getProductKardex(productId);

    if (!kardexData) {
      return res.status(404).json({
        success: false,
        message: `Medicamento #${productId} no encontrado.`
      });
    }

    res.status(200).json({
      success: true,
      data: kardexData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/inventory/valuation
 * Resumen Global de Inventario Valorizado
 */
async function getValuedInventorySummary(req, res, next) {
  try {
    const result = await ReportModel.getValuedInventorySummary();

    res.status(200).json({
      success: true,
      summary: result.summary,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  getProductKardex,
  getValuedInventorySummary
};
