const { get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: SETTINGS (PARÁMETROS FISCALES Y DE CONFIGURACIÓN)
 * ============================================================================
 * Representa la identidad jurídica, fiscal y sanitaria de la botica.
 * Alimenta la emisión de comprobantes SUNAT UBL 2.1 y auditorías de DIGEMID.
 */
class SettingsModel {
  /**
   * Validaciones defensivas de formato fiscal y sanitario.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data) {
    const errors = [];

    // 1. Razón Social
    if (data.companyName !== undefined && data.companyName !== null) {
      const name = String(data.companyName).trim();
      if (name.length < 3 || name.length > 200) {
        errors.push('La razón social de la empresa debe tener entre 3 y 200 caracteres.');
      }
    }

    // 2. Nombre Comercial
    if (data.commercialName !== undefined && data.commercialName !== null) {
      const cName = String(data.commercialName).trim();
      if (cName.length > 200) {
        errors.push('El nombre comercial no puede exceder los 200 caracteres.');
      }
    }

    // 3. RUC (11 dígitos numéricos y prefijo fiscal válido)
    if (data.ruc !== undefined && data.ruc !== null) {
      const ruc = String(data.ruc).trim();
      if (!/^\d{11}$/.test(ruc)) {
        errors.push('El RUC de la botica debe tener exactamente 11 dígitos numéricos.');
      } else if (!['10', '20', '15', '17'].some(p => ruc.startsWith(p))) {
        errors.push('El RUC debe iniciar con 10, 20, 15 o 17 conforme a normativa tributaria de SUNAT.');
      }
    }

    // 4. Porcentaje de IGV
    if (data.igvPercent !== undefined && data.igvPercent !== null) {
      const igv = parseFloat(data.igvPercent);
      if (isNaN(igv) || igv < 0 || igv > 100) {
        errors.push('El porcentaje de IGV debe ser un valor numérico entre 0 y 100.');
      }
    }

    // 5. Correo Electrónico
    if (data.email !== undefined && data.email !== null && String(data.email).trim() !== '') {
      const cleanEmail = String(data.email).trim();
      if (cleanEmail.length > 150) {
        errors.push('El correo electrónico no puede exceder los 150 caracteres.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.push('El formato del correo electrónico institucional es inválido.');
      }
    }

    // 6. Teléfono
    if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() !== '') {
      if (String(data.phone).trim().length > 50) {
        errors.push('El teléfono de contacto no puede exceder los 50 caracteres.');
      }
    }

    // 7. Licencia Sanitaria y Director Técnico (DIGEMID)
    if (data.sanitaryLicense !== undefined && data.sanitaryLicense !== null) {
      if (String(data.sanitaryLicense).trim().length > 100) {
        errors.push('El número de licencia sanitaria no puede exceder los 100 caracteres.');
      }
    }

    if (data.technicalDirector !== undefined && data.technicalDirector !== null) {
      if (String(data.technicalDirector).trim().length > 150) {
        errors.push('El nombre del director técnico (Q.F.) no puede exceder los 150 caracteres.');
      }
    }

    // 8. Tiempo de Cierre de Sesión (Minutos)
    if (data.sessionTimeoutMinutes !== undefined && data.sessionTimeoutMinutes !== null) {
      const timeout = parseInt(data.sessionTimeoutMinutes, 10);
      if (isNaN(timeout) || timeout < 1 || timeout > 10080) {
        errors.push('El tiempo de cierre de sesión debe ser un valor numérico entre 1 y 10080 minutos.');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Obtener los parámetros de configuración oficial de la botica (registro central ID = 1).
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async getSettings(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
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
        CAST(COALESCE(session_timeout_minutes, 720) AS INTEGER) AS "sessionTimeoutMinutes",
        updated_at AS "updatedAt"
      FROM configuraciones
      ORDER BY id ASC
      LIMIT 1;
    `);
  }

  /**
   * Actualizar los parámetros de la empresa en la base de datos.
   * @param {Object} data - Campos a modificar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Datos actualizados.
   */
  static async updateSettings(data, dbClient) {
    SettingsModel.validate(data);

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
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
        session_timeout_minutes = COALESCE($13, session_timeout_minutes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING 
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
        CAST(COALESCE(session_timeout_minutes, 720) AS INTEGER) AS "sessionTimeoutMinutes",
        updated_at AS "updatedAt";
    `, [
      data.companyName ? String(data.companyName).trim() : null,
      data.commercialName !== undefined ? (data.commercialName ? String(data.commercialName).trim() : null) : null,
      data.ruc ? String(data.ruc).trim() : null,
      data.address !== undefined ? (data.address ? String(data.address).trim() : null) : null,
      data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : null,
      data.email !== undefined ? (data.email ? String(data.email).trim() : null) : null,
      data.currencySymbol !== undefined ? (data.currencySymbol ? String(data.currencySymbol).trim() : null) : null,
      data.currencyCode !== undefined ? (data.currencyCode ? String(data.currencyCode).trim() : null) : null,
      data.igvPercent !== undefined && data.igvPercent !== null ? parseFloat(data.igvPercent) : null,
      data.sanitaryLicense !== undefined ? (data.sanitaryLicense ? String(data.sanitaryLicense).trim() : null) : null,
      data.technicalDirector !== undefined ? (data.technicalDirector ? String(data.technicalDirector).trim() : null) : null,
      data.invoiceFooterText !== undefined ? (data.invoiceFooterText ? String(data.invoiceFooterText).trim() : null) : null,
      data.sessionTimeoutMinutes !== undefined && data.sessionTimeoutMinutes !== null ? parseInt(data.sessionTimeoutMinutes, 10) : null
    ]);
  }

  /**
   * Obtener datos fiscales consolidados para la generación de XML UBL 2.1 (SUNAT).
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async getFiscalConfig(dbClient) {
    const config = await SettingsModel.getSettings(dbClient);
    if (!config) {
      return {
        ruc: process.env.COMPANY_RUC || '20601234567',
        name: process.env.COMPANY_NAME || 'VALETEC PHARMA S.A.C.',
        tradeName: process.env.COMPANY_TRADE_NAME || 'VALETEC PHARMA',
        address: process.env.COMPANY_ADDRESS || 'Av. Aviación 2450, San Borja, Lima',
        sanitaryLicense: process.env.SANITARY_LICENSE || 'AUT-DIGEMID-2026-904',
        technicalDirector: process.env.TECHNICAL_DIRECTOR || 'Q.F. Carlos Mendoza Paredes (C.Q.F.P. 14208)'
      };
    }

    return {
      ruc: config.ruc,
      name: config.companyName,
      tradeName: config.commercialName || config.companyName,
      address: config.address || 'Av. Aviación 2450, San Borja, Lima',
      sanitaryLicense: config.sanitaryLicense || process.env.SANITARY_LICENSE || 'AUT-DIGEMID-2026-904',
      technicalDirector: config.technicalDirector || 'Q.F. Carlos Mendoza Paredes (C.Q.F.P. 14208)'
    };
  }
}

module.exports = SettingsModel;
