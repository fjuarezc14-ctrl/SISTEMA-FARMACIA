const { transaction, query, get } = require('../db');
const { generateUBL21, numberToLetters } = require('../services/sunat.service');

/**
 * Mapeo de prefijo de serie por tipo de comprobante
 */
const SERIES_MAP = {
  boleta: 'B001',
  factura: 'F001',
  ticket: 'T001'
};

/**
 * Transacción Atómica de Venta:
 * 1. Valida stock y disponibilidad en lotes FEFO.
 * 2. Genera correlativo consecutivo (B001-XXXX).
 * 3. Desglosa IGV (18%) y base imponible.
 * 4. Deduce matemáticamente pastillas/unidades mínimas en lotes_fefo.
 * 5. Actualiza saldo esperado en la gaveta de caja (caja_turnos).
 * 6. Si algo falla (ej. stock insuficiente), PostgreSQL ejecuta ROLLBACK total.
 */
async function createSale(req, res, next) {
  try {
    const {
      items,
      invoiceType = 'boleta',
      customerDoc = '00000000',
      customerName = 'CLIENTE VARIOS',
      paymentMethod = 'cash',
      amountPaid,
      paymentReference = null,
      userId: bodyUserId
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'No se puede procesar una venta sin medicamentos en el carrito.'
      });
    }

    if (!['boleta', 'factura', 'ticket'].includes(invoiceType)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Tipo de comprobante inválido. Debe ser: boleta, factura o ticket.'
      });
    }

    if (!['cash', 'yape', 'card'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Método de pago inválido. Debe ser: cash, yape o card.'
      });
    }

    const sanitizedRef = paymentReference ? String(paymentReference).trim() : null;

    // Identificar usuario autenticado (prioridad estricta para prevenir suplantación de identidad)
    let activeUserId = (req.user && req.user.id) ? req.user.id : null;
    if (!activeUserId) {
      const defaultCashier = await get("SELECT id FROM usuarios WHERE email = 'caja@valetec.pe' LIMIT 1");
      activeUserId = defaultCashier ? defaultCashier.id : null;
      if (!activeUserId) {
        const anyUser = await get("SELECT id FROM usuarios LIMIT 1");
        activeUserId = anyUser ? anyUser.id : 1;
      }
    }

    // Ejecutar transacción atómica ACID
    const saleResult = await transaction(async ({ run, get, query }) => {
      // 1. Obtener turno de caja abierto
      const shift = await get("SELECT * FROM caja_turnos WHERE status = 'open' ORDER BY id DESC LIMIT 1");
      const turnoId = shift ? shift.id : null;

      // 2. Determinar serie y correlativo
      const series = SERIES_MAP[invoiceType];

      // H-02 Candado atómico en PostgreSQL para serializar la generación de correlativos por serie
      // Evita duplicidad de numeración bajo ráfagas de peticiones concurrentes
      await run('SELECT pg_advisory_xact_lock(hashtext($1))', [`correlative_series_${series}`]);

      const maxNumRow = await get(
        'SELECT COALESCE(MAX(invoice_number), 0) AS max_num FROM ventas WHERE invoice_series = $1',
        [series]
      );
      const nextNumber = parseInt(maxNumRow.max_num, 10) + 1;
      const formattedCorrelative = `${series}-${String(nextNumber).padStart(6, '0')}`;

      // 3. Validar productos y calcular totales
      let calculatedTotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const prod = await get('SELECT * FROM productos WHERE id = $1', [item.productId]);
        if (!prod) {
          const err = new Error(`Producto con ID ${item.productId} no encontrado en el catálogo.`);
          err.statusCode = 400;
          throw err;
        }

        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          const err = new Error(`Cantidad inválida para el producto "${prod.name}".`);
          err.statusCode = 400;
          throw err;
        }

        let price = parseFloat(item.unitPrice);
        if (isNaN(price) || price < 0) {
          if (item.fractionType === 'box') price = parseFloat(prod.box_price);
          else if (item.fractionType === 'blister') price = parseFloat(prod.blister_price);
          else price = parseFloat(prod.unit_price);
        }

        const itemSubtotal = Math.round(price * qty * 100) / 100;
        calculatedTotal += itemSubtotal;

        // Calcular pastillas base necesarias según la fracción
        let baseUnitsNeeded = qty;
        if (item.fractionType === 'box') {
          baseUnitsNeeded = qty * (parseInt(prod.units_per_box, 10) || 100);
        } else if (item.fractionType === 'blister') {
          const unitsPerBlister = parseInt(prod.units_per_blister, 10) || 10;
          baseUnitsNeeded = qty * unitsPerBlister;
        }

        // Consultar lotes activos del producto con bloqueo de fila transaccional (H-02: FOR UPDATE)
        // Bloquea las filas en PostgreSQL hasta el COMMIT, impidiendo sobreventas e inventario fantasma
        const lots = await query(
          `SELECT id, lot_number, expire_date, stock_units, stock_boxes, stock_blisters 
           FROM lotes_fefo 
           WHERE product_id = $1 AND stock_units > 0 
           ORDER BY expire_date ASC, id ASC
           FOR UPDATE`,
          [prod.id]
        );

        const totalAvailableUnits = lots.reduce((sum, l) => sum + parseInt(l.stock_units, 10), 0);
        if (totalAvailableUnits < baseUnitsNeeded) {
          const err = new Error(
            `Stock insuficiente en almacén para "${prod.name}". Stock disponible: ${totalAvailableUnits} pastillas, Solicitado: ${baseUnitsNeeded} pastillas.`
          );
          err.statusCode = 400;
          throw err;
        }

        validatedItems.push({
          productId: prod.id,
          productName: prod.name,
          fractionType: item.fractionType,
          quantity: qty,
          unitPrice: price,
          subtotal: itemSubtotal,
          baseUnitsNeeded,
          unitsPerBox: parseInt(prod.units_per_box, 10),
          unitsPerBlister: parseInt(prod.units_per_blister, 10),
          lots
        });
      }

      calculatedTotal = Math.round(calculatedTotal * 100) / 100;

      // Base imponible (Subtotal sin IGV) e Impuesto (IGV 18%)
      const subtotalBase = Math.round((calculatedTotal / 1.18) * 100) / 100;
      const igvAmount = Math.round((calculatedTotal - subtotalBase) * 100) / 100;

      // Cálculo de dinero recibido y vuelto
      let paid = calculatedTotal;
      let changeGiven = 0;

      if (paymentMethod === 'cash') {
        paid = (amountPaid !== undefined && amountPaid !== null && amountPaid !== '') ? parseFloat(amountPaid) : calculatedTotal;
        if (paid < calculatedTotal) {
          const err = new Error(`Monto recibido (S/ ${paid.toFixed(2)}) es menor al total de la venta (S/ ${calculatedTotal.toFixed(2)}).`);
          err.statusCode = 400;
          throw err;
        }
        changeGiven = Math.max(0, Math.round((paid - calculatedTotal) * 100) / 100);
      } else {
        paid = calculatedTotal;
        changeGiven = 0;
      }

      // 3.1 Generación de comprobante electrónico UBL 2.1 y Hash SHA-256 (SUNAT)
      let cpeData = null;
      if (['boleta', 'factura'].includes(invoiceType)) {
        cpeData = generateUBL21({
          invoiceSeries: series,
          invoiceNumber: nextNumber,
          invoiceType,
          customerDoc,
          customerName,
          subtotal: subtotalBase,
          igv: igvAmount,
          total: calculatedTotal,
          items: validatedItems,
          createdAt: new Date()
        });
      }

      // 4. Insertar cabecera de la venta en PostgreSQL
      const insertSaleRes = await query(
        `INSERT INTO ventas 
         (invoice_series, invoice_number, invoice_type, user_id, turno_id, customer_doc, customer_name, payment_method, payment_reference, subtotal, igv, total, amount_paid, change_given, status, hash_cpe, xml_ubl)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed', $15, $16)
         RETURNING id`,
        [
          series, nextNumber, invoiceType, activeUserId, turnoId, customerDoc, customerName,
          paymentMethod, sanitizedRef, subtotalBase, igvAmount, calculatedTotal, paid, changeGiven,
          cpeData ? cpeData.hash : null,
          cpeData ? cpeData.xml : null
        ]
      );
      const saleId = insertSaleRes[0].id;

      // 5. Deducción FEFO lote por lote y registro de partidas
      const dispensedDetails = [];

      for (const item of validatedItems) {
        let remainingToDeduct = item.baseUnitsNeeded;
        let primaryLotId = item.lots[0] ? item.lots[0].id : null;

        for (const lot of item.lots) {
          if (remainingToDeduct <= 0) break;

          const lotStock = parseInt(lot.stock_units, 10);
          const deductFromThisLot = Math.min(remainingToDeduct, lotStock);
          const newUnits = lotStock - deductFromThisLot;

          const uPerBox = item.unitsPerBox || 100;
          const uPerBlister = item.unitsPerBlister || 10;
          const newBoxes = Math.floor(newUnits / uPerBox);
          const newBlisters = Math.floor(newUnits / uPerBlister);
          const newStatus = newUnits === 0 ? 'expired' : 'good';

          // Actualizar lote en PostgreSQL
          await run(
            `UPDATE lotes_fefo 
             SET stock_units = $1, stock_boxes = $2, stock_blisters = $3, fefo_status = $4, updated_at = NOW() 
             WHERE id = $5`,
            [newUnits, newBoxes, newBlisters, newStatus, lot.id]
          );

          remainingToDeduct -= deductFromThisLot;
          primaryLotId = lot.id;
        }

        // Registrar detalle de venta
        await run(
          `INSERT INTO ventas_detalles 
           (sale_id, product_id, lot_id, fraction_type, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [saleId, item.productId, primaryLotId, item.fractionType, item.quantity, item.unitPrice, item.subtotal]
        );

        dispensedDetails.push({
          productName: item.productName,
          fractionType: item.fractionType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          lotNumber: item.lots[0] ? item.lots[0].lot_number : 'L-DEF'
        });
      }

      // 6. Actualizar balance del turno de caja en PostgreSQL
      if (turnoId) {
        if (paymentMethod === 'cash') {
          await run(
            `UPDATE caja_turnos 
             SET cash_sales = cash_sales + $1,
                 expected_balance = (opening_balance + cash_sales + $1) - expenses
             WHERE id = $2`,
            [calculatedTotal, turnoId]
          );
        } else {
          await run(
            `UPDATE caja_turnos 
             SET digital_sales = digital_sales + $1
             WHERE id = $2`,
            [calculatedTotal, turnoId]
          );
        }
      }

      const totalInWords = cpeData ? cpeData.totalInWords : numberToLetters(calculatedTotal);

      return {
        saleId,
        correlative: formattedCorrelative,
        invoiceSeries: series,
        invoiceNumber: nextNumber,
        invoiceType,
        customerDoc,
        customerName,
        paymentMethod,
        paymentReference: sanitizedRef,
        subtotal: subtotalBase,
        igv: igvAmount,
        total: calculatedTotal,
        totalInWords,
        amountPaid: paid,
        changeGiven,
        cpe: cpeData ? {
          cpeId: cpeData.cpeId,
          tipoCpe: cpeData.tipoCpe,
          hash: cpeData.hash,
          hashHex: cpeData.hashHex,
          totalInWords: cpeData.totalInWords,
          taxBreakdown: cpeData.taxBreakdown,
          sunatStatus: 'GENERADO_UBL21'
        } : null,
        items: dispensedDetails,
        createdAt: new Date().toISOString()
      };
    });

    res.status(201).json({
      success: true,
      message: `Comprobante ${saleResult.correlative} emitido exitosamente con UBL 2.1 y descuento FEFO en PostgreSQL.`,
      data: saleResult
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Listar ventas históricas
 */
async function getSales(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const sales = await query(`
      SELECT 
        v.id,
        v.invoice_series AS "invoiceSeries",
        v.invoice_number AS "invoiceNumber",
        (v.invoice_series || '-' || LPAD(v.invoice_number::text, 6, '0')) AS correlative,
        v.invoice_type AS "invoiceType",
        v.customer_doc AS "customerDoc",
        v.customer_name AS "customerName",
        v.payment_method AS "paymentMethod",
        v.payment_reference AS "paymentReference",
        CAST(v.subtotal AS FLOAT) AS subtotal,
        CAST(v.igv AS FLOAT) AS igv,
        CAST(v.total AS FLOAT) AS total,
        CAST(v.amount_paid AS FLOAT) AS "amountPaid",
        CAST(v.change_given AS FLOAT) AS "changeGiven",
        v.hash_cpe AS "hashCpe",
        v.status,
        TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        u.name AS "cashierName"
      FROM ventas v
      JOIN usuarios u ON v.user_id = u.id
      ORDER BY v.id DESC
      LIMIT $1;
    `, [limit]);

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener detalle completo de un comprobante con partidas para ticket térmico
 */
async function getSaleById(req, res, next) {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (isNaN(saleId)) {
      return res.status(400).json({ success: false, message: 'ID de venta inválido.' });
    }

    const sale = await get(`
      SELECT 
        v.id,
        v.invoice_series AS "invoiceSeries",
        v.invoice_number AS "invoiceNumber",
        (v.invoice_series || '-' || LPAD(v.invoice_number::text, 6, '0')) AS correlative,
        v.invoice_type AS "invoiceType",
        v.customer_doc AS "customerDoc",
        v.customer_name AS "customerName",
        v.payment_method AS "paymentMethod",
        v.payment_reference AS "paymentReference",
        CAST(v.subtotal AS FLOAT) AS subtotal,
        CAST(v.igv AS FLOAT) AS igv,
        CAST(v.total AS FLOAT) AS total,
        CAST(v.amount_paid AS FLOAT) AS "amountPaid",
        CAST(v.change_given AS FLOAT) AS "changeGiven",
        v.hash_cpe AS "hashCpe",
        v.xml_ubl AS "xmlUbl",
        v.status,
        TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        u.name AS "cashierName"
      FROM ventas v
      JOIN usuarios u ON v.user_id = u.id
      WHERE v.id = $1;
    `, [saleId]);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    }

    const items = await query(`
      SELECT 
        d.id,
        p.name AS "productName",
        p.generic_dci AS "genericDci",
        d.fraction_type AS "fractionType",
        d.quantity,
        CAST(d.unit_price AS FLOAT) AS "unitPrice",
        CAST(d.subtotal AS FLOAT) AS subtotal,
        l.lot_number AS "lotNumber"
      FROM ventas_detalles d
      JOIN productos p ON d.product_id = p.id
      LEFT JOIN lotes_fefo l ON d.lot_id = l.id
      WHERE d.sale_id = $1
      ORDER BY d.id ASC;
    `, [saleId]);

    res.status(200).json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Anular venta y restituir stock en lotes FEFO y saldo en turno de caja (ACID)
 */
async function cancelSale(req, res, next) {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (isNaN(saleId)) {
      return res.status(400).json({ success: false, message: 'ID de venta inválido.' });
    }

    const cancelResult = await transaction(async ({ run, get, query }) => {
      // 1. Obtener y bloquear la venta
      const sale = await get('SELECT * FROM ventas WHERE id = $1 FOR UPDATE', [saleId]);
      if (!sale) {
        const err = new Error('Venta no encontrada.');
        err.statusCode = 404;
        throw err;
      }

      if (sale.status === 'cancelled') {
        const err = new Error('Esta venta ya se encuentra anulada.');
        err.statusCode = 400;
        throw err;
      }

      if (sale.status !== 'completed') {
        const err = new Error(`Solo se pueden anular ventas con estado completado (estado actual: ${sale.status}).`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Obtener partidas de venta
      const items = await query(
        `SELECT d.id, d.product_id, d.lot_id, d.fraction_type, d.quantity,
                p.units_per_box, p.units_per_blister, p.name AS product_name
         FROM ventas_detalles d
         JOIN productos p ON d.product_id = p.id
         WHERE d.sale_id = $1`,
        [saleId]
      );

      // 3. Restituir stock lote por lote en lotes_fefo
      for (const item of items) {
        const qty = parseInt(item.quantity, 10) || 0;
        const unitsPerBox = parseInt(item.units_per_box, 10) || 100;
        const unitsPerBlister = parseInt(item.units_per_blister, 10) || 10;

        let baseUnitsToRestore = qty;
        if (item.fraction_type === 'box') {
          baseUnitsToRestore = qty * unitsPerBox;
        } else if (item.fraction_type === 'blister') {
          baseUnitsToRestore = qty * unitsPerBlister;
        }

        if (item.lot_id) {
          const lot = await get('SELECT * FROM lotes_fefo WHERE id = $1 FOR UPDATE', [item.lot_id]);
          if (lot) {
            const newUnits = parseInt(lot.stock_units, 10) + baseUnitsToRestore;
            const newBoxes = Math.floor(newUnits / unitsPerBox);
            const newBlisters = Math.floor(newUnits / unitsPerBlister);

            await run(
              `UPDATE lotes_fefo 
               SET stock_units = $1, stock_boxes = $2, stock_blisters = $3, fefo_status = 'good', updated_at = NOW() 
               WHERE id = $4`,
              [newUnits, newBoxes, newBlisters, lot.id]
            );
          }
        }
      }

      // 4. Ajustar turno de caja si la venta estuvo asignada a un turno
      if (sale.turno_id) {
        const saleTotal = parseFloat(sale.total);
        if (sale.payment_method === 'cash') {
          await run(
            `UPDATE caja_turnos 
             SET cash_sales = GREATEST(0, cash_sales - $1),
                 expected_balance = (opening_balance + GREATEST(0, cash_sales - $1)) - expenses
             WHERE id = $2`,
            [saleTotal, sale.turno_id]
          );
        } else {
          await run(
            `UPDATE caja_turnos 
             SET digital_sales = GREATEST(0, digital_sales - $1)
             WHERE id = $2`,
            [saleTotal, sale.turno_id]
          );
        }
      }

      // 5. Marcar venta como anulada
      await run(
        `UPDATE ventas 
         SET status = 'cancelled' 
         WHERE id = $1`,
        [saleId]
      );

      const correlative = `${sale.invoice_series}-${String(sale.invoice_number).padStart(6, '0')}`;
      return {
        saleId: sale.id,
        correlative,
        status: 'cancelled',
        total: parseFloat(sale.total)
      };
    });

    res.status(200).json({
      success: true,
      message: `Venta ${cancelResult.correlative} anulada exitosamente. Stock devuelto a almacén y caja actualizada.`,
      data: cancelResult
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSale,
  getSales,
  getSaleById,
  cancelSale
};
