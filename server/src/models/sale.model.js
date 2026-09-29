const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: SALE (VENTAS, COMPROBANTES Y CORRELATIVOS SUNAT)
 * ============================================================================
 * Representa las transacciones comerciales, emisión de Boletas/Facturas electrónicas
 * y la persistencia atómica de partidas multi-lote FEFO.
 */
class SaleModel {
  /**
   * Mapeo oficial de series según tipo de comprobante de pago
   */
  static SERIES_MAP = {
    boleta: 'B001',
    factura: 'F001',
    ticket: 'T001'
  };

  /**
   * Métodos de pago permitidos en el sistema
   */
  static PAYMENT_METHODS = ['cash', 'yape', 'card'];

  /**
   * Tipos de comprobante reconocidos
   */
  static INVOICE_TYPES = ['boleta', 'factura', 'ticket'];

  /**
   * Tipos de fracción admitidos en ventas
   */
  static FRACTION_TYPES = ['box', 'blister', 'unit'];

  /**
   * Validaciones defensivas de integridad para una venta.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data) {
    const errors = [];

    // 1. Tipo de comprobante
    if (!data.invoiceType || !SaleModel.INVOICE_TYPES.includes(data.invoiceType)) {
      errors.push(`El tipo de comprobante es inválido. Debe ser uno de: ${SaleModel.INVOICE_TYPES.join(', ')}.`);
    }

    // 2. Método de pago
    if (!data.paymentMethod || !SaleModel.PAYMENT_METHODS.includes(data.paymentMethod)) {
      errors.push(`El método de pago es inválido. Debe ser uno de: ${SaleModel.PAYMENT_METHODS.join(', ')}.`);
    }

    // 3. Ítems del carrito
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push('La venta debe contener al menos un producto en la lista de ítems.');
    } else {
      data.items.forEach((item, index) => {
        const prodId = parseInt(item.productId, 10);
        const qty = parseInt(item.quantity, 10);
        if (isNaN(prodId) || prodId <= 0) {
          errors.push(`Ítem #${index + 1}: ID de producto inválido.`);
        }
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Ítem #${index + 1}: La cantidad debe ser un entero mayor a cero.`);
        }
        if (!item.fractionType || !SaleModel.FRACTION_TYPES.includes(item.fractionType)) {
          errors.push(`Ítem #${index + 1}: Fracción inválida. Debe ser "box", "blister" o "unit".`);
        }
      });
    }

    // 4. Reglas estrictas para Factura Electrónica (SUNAT)
    if (data.invoiceType === 'factura') {
      const ruc = data.customerDoc ? String(data.customerDoc).trim() : '';
      const name = data.customerName ? String(data.customerName).trim() : '';

      if (!ruc || !/^\d{11}$/.test(ruc)) {
        errors.push('Para emitir Factura Electrónica es obligatorio un RUC de 11 dígitos numéricos.');
      } else if (!['10', '20', '15', '17'].some(p => ruc.startsWith(p))) {
        errors.push('El RUC ingresado no es válido para facturación (debe iniciar con 10, 20, 15 o 17).');
      }

      if (!name || name.length < 3) {
        errors.push('Para emitir Factura Electrónica debe registrarse la Razón Social de la empresa receptora.');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Validar que un ID numérico sea entero positivo.
   */
  static validateId(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0) {
      const err = new Error('El ID de venta debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Generar correlativo atómico con candado transaccional pg_advisory_xact_lock.
   * Garantiza correlatividad estricta sin saltos ni duplicados bajo concurrencia.
   * @param {string} series - Serie del comprobante (ej: 'B001', 'F001').
   * @param {Object} clientTx - Cliente transaccional OBLIGATORIO.
   * @returns {Promise<{ nextNumber: number, formattedCorrelative: string }>}
   */
  static async getNextCorrelative(series, clientTx) {
    if (!series) throw new Error('La serie es obligatoria para generar el correlativo.');
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;
    const getFn = (clientTx && clientTx.get) ? clientTx.get.bind(clientTx) : get;

    // Candado atómico exclusivo por serie en PostgreSQL
    await runFn('SELECT pg_advisory_xact_lock(hashtext($1));', [`correlative_series_${series}`]);

    const maxRow = await getFn(`
      SELECT COALESCE(MAX(invoice_number), 0) AS max_num 
      FROM ventas 
      WHERE invoice_series = $1;
    `, [series]);

    const nextNumber = parseInt(maxRow.max_num, 10) + 1;
    const formattedCorrelative = `${series}-${String(nextNumber).padStart(6, '0')}`;

    return { nextNumber, formattedCorrelative };
  }

  /**
   * Insertar la cabecera de la venta en la tabla ventas.
   * @param {Object} saleData - Datos de la cabecera de venta.
   * @param {Object} clientTx - Cliente transaccional.
   * @returns {Promise<Object>} Cabecera insertada con su ID generado.
   */
  static async insertSaleHeader(saleData, clientTx) {
    const getFn = (clientTx && clientTx.get) ? clientTx.get.bind(clientTx) : get;
    const isFiscal = ['boleta', 'factura'].includes(saleData.invoiceType);
    const initialSunatStatus = saleData.sunatStatus || (isFiscal ? 'pending' : 'not_applicable');

    return await getFn(`
      INSERT INTO ventas (
        invoice_series, invoice_number, invoice_type, user_id, turno_id,
        customer_doc, customer_name, payment_method,
        subtotal, igv, total, amount_paid, change_given,
        payment_reference, status, sunat_status, hash_cpe, xml_ubl
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `, [
      saleData.invoiceSeries,
      saleData.invoiceNumber,
      saleData.invoiceType,
      saleData.userId,
      saleData.turnoId || null,
      saleData.customerDoc || null,
      saleData.customerName || null,
      saleData.paymentMethod,
      saleData.subtotal,
      saleData.igv,
      saleData.total,
      saleData.amountPaid,
      saleData.changeGiven || 0.00,
      saleData.paymentReference || null,
      'completed',
      initialSunatStatus,
      saleData.hashCpe || null,
      saleData.xmlUbl || null
    ]);
  }

  /**
   * Actualizar estado de respuesta de SUNAT para una venta de forma atómica.
   * @param {number|string} saleId - ID de la venta.
   * @param {Object} statusData - { status, response, ticket }
   * @param {Object} [clientTx] - Cliente transaccional opcional.
   */
  static async updateSunatStatus(saleId, statusData, clientTx) {
    const validId = SaleModel.validateId(saleId);
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;
    const { status, response, ticket = null } = statusData;

    return await runFn(`
      UPDATE ventas
      SET 
        sunat_status = $1,
        sunat_response = $2,
        sunat_ticket = COALESCE($3, sunat_ticket),
        sunat_sent_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [status, response || null, ticket, validId]);
  }

  /**
   * Obtener comprobantes pendientes de sincronizar o en cola con SUNAT.
   * @param {number} [limit=20] - Máximo número de comprobantes a obtener.
   * @param {Object} [clientTx] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getPendingSunatSales(limit = 20, clientTx) {
    const queryFn = (clientTx && clientTx.query) ? clientTx.query.bind(clientTx) : query;
    return await queryFn(`
      SELECT 
        v.id,
        v.invoice_series AS "invoiceSeries",
        v.invoice_number AS "invoiceNumber",
        v.invoice_type AS "invoiceType",
        v.customer_doc AS "customerDoc",
        v.customer_name AS "customerName",
        v.total,
        v.hash_cpe AS "hashCpe",
        v.xml_ubl AS "xmlUbl",
        v.sunat_status AS "sunatStatus",
        v.sunat_response AS "sunatResponse",
        v.sunat_sent_at AS "sunatSentAt",
        TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM ventas v
      WHERE v.invoice_type IN ('boleta', 'factura')
        AND v.sunat_status IN ('pending', 'pending_retry', 'error')
        AND v.status = 'completed'
      ORDER BY v.id ASC
      LIMIT $1;
    `, [limit]);
  }

  /**
   * Registrar una partida individual de lote en ventas_detalles.
   * Soluciona el Error 1 (cada lote dispensado tiene su fila propia).
   * @param {Object} detail - { saleId, productId, lotId, fractionType, quantity, unitPrice, subtotal }
   * @param {Object} clientTx - Cliente transaccional.
   * @returns {Promise<Object>}
   */
  static async insertSaleDetail(detail, clientTx) {
    const getFn = (clientTx && clientTx.get) ? clientTx.get.bind(clientTx) : get;

    return await getFn(`
      INSERT INTO ventas_detalles (
        sale_id, product_id, lot_id, fraction_type, quantity, unit_price, subtotal
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [
      detail.saleId,
      detail.productId,
      detail.lotId || null,
      detail.fractionType,
      detail.quantity,
      detail.unitPrice,
      detail.subtotal
    ]);
  }

  /**
   * Acumular ventas en el turno de caja abierto del cajero.
   * @param {number|string} turnoId - ID del turno de caja.
   * @param {number} totalAmount - Monto total a acumular.
   * @param {string} paymentMethod - 'cash', 'yape' o 'card'.
   * @param {Object} clientTx - Cliente transaccional.
   */
  static async updateShiftSales(turnoId, totalAmount, paymentMethod, clientTx) {
    if (!turnoId) return;
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;
    const total = parseFloat(totalAmount) || 0;

    if (paymentMethod === 'cash') {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          cash_sales = cash_sales + $1,
          expected_balance = expected_balance + $1
        WHERE id = $2;
      `, [total, turnoId]);
    } else {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          digital_sales = digital_sales + $1
        WHERE id = $2;
      `, [total, turnoId]);
    }
  }

  /**
   * Revertir acumulados en turno de caja ante anulación de venta.
   * @param {number|string} turnoId - ID del turno.
   * @param {number} totalAmount - Monto a revertir.
   * @param {string} paymentMethod - 'cash', 'yape', 'card'.
   * @param {Object} clientTx - Cliente transaccional.
   */
  static async revertShiftSales(turnoId, totalAmount, paymentMethod, clientTx) {
    if (!turnoId) return;
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;
    const total = parseFloat(totalAmount) || 0;

    if (paymentMethod === 'cash') {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          cash_sales = GREATEST(0, cash_sales - $1),
          expected_balance = GREATEST(0, expected_balance - $1)
        WHERE id = $2;
      `, [total, turnoId]);
    } else {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          digital_sales = GREATEST(0, digital_sales - $1)
        WHERE id = $2;
      `, [total, turnoId]);
    }
  }

  /**
   * Listar historial de ventas con filtros de fecha, comprobante y estado.
   * @param {Object} [filters] - { date, invoiceType, status, userId, limit }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getSalesList(filters = {}, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    const conditions = [];
    const params = [];

    if (filters.date) {
      params.push(filters.date);
      conditions.push(`DATE(v.created_at) = $${params.length}`);
    }
    if (filters.invoiceType) {
      params.push(filters.invoiceType);
      conditions.push(`v.invoice_type = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`v.status = $${params.length}`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      conditions.push(`v.user_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const isPaginated = filters && filters.page !== undefined;
    const pageNum = isPaginated ? Math.max(parseInt(filters.page || 1, 10), 1) : 1;
    const limitNum = Math.min(Math.max(parseInt(filters.limit || 50, 10), 1), 200);

    params.push(limitNum);
    const limitIdx = params.length;

    let paginationClause = `LIMIT $${limitIdx}`;
    if (isPaginated) {
      const offset = (pageNum - 1) * limitNum;
      params.push(offset);
      const offsetIdx = params.length;
      paginationClause = `LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    }

    const rows = await queryFn(`
      SELECT 
        v.id,
        v.invoice_series || '-' || LPAD(v.invoice_number::text, 6, '0') AS "invoiceNumberFormatted",
        v.invoice_series AS "series",
        v.invoice_number AS "number",
        v.invoice_type AS "invoiceType",
        v.customer_doc AS "customerDoc",
        COALESCE(v.customer_name, 'Cliente Varios') AS "customerName",
        v.payment_method AS "paymentMethod",
        CAST(v.subtotal AS FLOAT) AS "subtotal",
        CAST(v.igv AS FLOAT) AS "igv",
        CAST(v.total AS FLOAT) AS "total",
        CAST(v.amount_paid AS FLOAT) AS "amountPaid",
        CAST(v.change_given AS FLOAT) AS "changeGiven",
        v.status,
        COALESCE(v.sunat_status, 'pending') AS "sunatStatus",
        v.sunat_response AS "sunatResponse",
        TO_CHAR(v.sunat_sent_at, 'YYYY-MM-DD HH24:MI:SS') AS "sunatSentAt",
        v.hash_cpe AS "hashCpe",
        u.name AS "cashierName",
        TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        COUNT(*) OVER() AS full_count
      FROM ventas v
      JOIN usuarios u ON v.user_id = u.id
      ${whereClause}
      ORDER BY v.id DESC
      ${paginationClause};
    `, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;
    const formatted = rows.map(r => {
      const { full_count, ...clean } = r;
      return clean;
    });

    if (isPaginated) {
      return {
        data: formatted,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1
        }
      };
    }

    return formatted;
  }

  /**
   * Obtener una venta por ID con su cabecera completa.
   * @param {number|string} saleId - ID de la venta.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async getSaleById(saleId, dbClient) {
    const validId = SaleModel.validateId(saleId);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        v.id,
        v.invoice_series || '-' || LPAD(v.invoice_number::text, 6, '0') AS "invoiceNumberFormatted",
        v.invoice_series AS "series",
        v.invoice_number AS "number",
        v.invoice_type AS "invoiceType",
        v.customer_doc AS "customerDoc",
        COALESCE(v.customer_name, 'Cliente Varios') AS "customerName",
        v.payment_method AS "paymentMethod",
        CAST(v.subtotal AS FLOAT) AS "subtotal",
        CAST(v.igv AS FLOAT) AS "igv",
        CAST(v.total AS FLOAT) AS "total",
        CAST(v.amount_paid AS FLOAT) AS "amountPaid",
        CAST(v.change_given AS FLOAT) AS "changeGiven",
        v.payment_reference AS "paymentReference",
        v.status,
        v.hash_cpe AS "hashCpe",
        v.xml_ubl AS "xmlUbl",
        v.turno_id AS "turnoId",
        v.user_id AS "userId",
        u.name AS "cashierName",
        TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM ventas v
      JOIN usuarios u ON v.user_id = u.id
      WHERE v.id = $1
      LIMIT 1;
    `, [validId]);
  }

  /**
   * Obtener los renglones de detalle de una venta vinculados a sus productos y lotes.
   * @param {number|string} saleId - ID de la venta.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getSaleDetails(saleId, dbClient) {
    const validId = SaleModel.validateId(saleId);
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        vd.id,
        vd.product_id AS "productId",
        p.name AS "productName",
        p.generic_dci AS "genericDci",
        p.units_per_box AS "unitsPerBox",
        p.units_per_blister AS "unitsPerBlister",
        vd.lot_id AS "lotId",
        COALESCE(l.lot_number, 'N/A') AS "lotNumber",
        vd.fraction_type AS "fractionType",
        vd.quantity,
        CAST(vd.unit_price AS FLOAT) AS "unitPrice",
        CAST(vd.subtotal AS FLOAT) AS "subtotal"
      FROM ventas_detalles vd
      JOIN productos p ON vd.product_id = p.id
      LEFT JOIN lotes_fefo l ON vd.lot_id = l.id
      WHERE vd.sale_id = $1
      ORDER BY vd.id ASC;
    `, [validId]);
  }

  /**
   * Marcar una venta como anulada en PostgreSQL.
   * @param {number|string} saleId - ID de la venta.
   * @param {Object} clientTx - Cliente transaccional.
   */
  static async cancelSaleHeader(saleId, clientTx) {
    const validId = SaleModel.validateId(saleId);
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;

    await runFn(`
      UPDATE ventas 
      SET status = 'cancelled' 
      WHERE id = $1;
    `, [validId]);
  }
}

module.exports = SaleModel;
