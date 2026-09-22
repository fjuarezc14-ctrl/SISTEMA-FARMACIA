const { get, run } = require('../db');

/**
 * GET /api/settings
 * Obtener los parámetros de configuración oficial de la botica
 */
async function getSettings(req, res, next) {
  try {
    const config = await get(`
      SELECT 
        id,
        company_name AS "companyName",
        commercial_name AS "commercialName",
        ruc,
        address,
        phone,
        email,
        currency_symbol AS "currencySymbol",
        currency_code AS "currencyCode",
        CAST(igv_percent AS FLOAT) AS "igvPercent",
        sanitary_license AS "sanitaryLicense",
        technical_director AS "technicalDirector",
        invoice_footer_text AS "invoiceFooterText",
        updated_at AS "updatedAt"
      FROM configuraciones
      ORDER BY id ASC
      LIMIT 1;
    `);

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
    const {
      companyName,
      commercialName,
      ruc,
      address,
      phone,
      email,
      currencySymbol,
      currencyCode,
      igvPercent,
      sanitaryLicense,
      technicalDirector,
      invoiceFooterText
    } = req.body;

    // 1. Validaciones de integridad y formato fiscal
    if (companyName !== undefined && companyName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'La razón social debe tener al menos 3 caracteres.'
      });
    }

    if (ruc !== undefined && !/^\d{11}$/.test(ruc.trim())) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El RUC debe tener exactamente 11 dígitos numéricos.'
      });
    }

    if (igvPercent !== undefined && (isNaN(igvPercent) || igvPercent < 0 || igvPercent > 100)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El porcentaje de IGV debe ser un valor numérico entre 0 y 100.'
      });
    }

    // 2. Actualizar registro central (id = 1) en PostgreSQL
    await run(`
      UPDATE configuraciones
      SET 
        company_name = COALESCE($1, company_name),
        commercial_name = COALESCE($2, commercial_name),
        ruc = COALESCE($3, ruc),
        address = COALESCE($4, address),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        currency_symbol = COALESCE($7, currency_symbol),
        currency_code = COALESCE($8, currency_code),
        igv_percent = COALESCE($9, igv_percent),
        sanitary_license = COALESCE($10, sanitary_license),
        technical_director = COALESCE($11, technical_director),
        invoice_footer_text = COALESCE($12, invoice_footer_text),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1;
    `, [
      companyName ? companyName.trim() : null,
      commercialName ? commercialName.trim() : null,
      ruc ? ruc.trim() : null,
      address ? address.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      currencySymbol ? currencySymbol.trim() : null,
      currencyCode ? currencyCode.trim() : null,
      igvPercent !== undefined ? parseFloat(igvPercent) : null,
      sanitaryLicense ? sanitaryLicense.trim() : null,
      technicalDirector ? technicalDirector.trim() : null,
      invoiceFooterText ? invoiceFooterText.trim() : null
    ]);

    // 3. Obtener registro actualizado
    const updated = await get(`
      SELECT 
        id,
        company_name AS "companyName",
        commercial_name AS "commercialName",
        ruc,
        address,
        phone,
        email,
        currency_symbol AS "currencySymbol",
        currency_code AS "currencyCode",
        CAST(igv_percent AS FLOAT) AS "igvPercent",
        sanitary_license AS "sanitaryLicense",
        technical_director AS "technicalDirector",
        invoice_footer_text AS "invoiceFooterText",
        updated_at AS "updatedAt"
      FROM configuraciones
      WHERE id = 1;
    `);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Configuraciones de la botica actualizadas correctamente.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
