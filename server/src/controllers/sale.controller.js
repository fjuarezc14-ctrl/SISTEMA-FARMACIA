const { transaction } = require('../db');
const { generateUBL21, numberToLetters } = require('../services/sunat.service');
const SaleModel = require('../models/sale.model');
const ProductModel = require('../models/product.model');
const SettingsModel = require('../models/settings.model');
const CashModel = require('../models/cash.model');
const SunatWorker = require('../services/sunat.worker');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: SALE (VENTAS, FACTURACIÓN SUNAT Y FEFO)
 * ============================================================================
 * Orquesta la transacción de venta en mostrador (POS), emisión de Boletas/Facturas
 * electrónicas UBL 2.1, partición exacta de partidas multi-lote FEFO y Cierre de turno.
 */

/**
 * Determina el estado FEFO de un lote según su fecha de caducidad
 */
function calculateFefoStatus(expireDateStr) {
  if (!expireDateStr) return 'good';
  const now = new Date();
  const exp = new Date(expireDateStr);
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'expired';
  if (diffDays <= 90) return 'warning';
  return 'good';
}

/**
 * POST /api/sales
 * Transacción Atómica de Venta:
 * 1. Valida reglas sanitarias y de catálogo mediante ProductModel y SaleModel.
 * 2. Bloquea filas de lotes con FOR UPDATE y filtro sanitario expire_date >= CURRENT_DATE.
 * 3. Genera correlativo atómico con pg_advisory_xact_lock.
 * 4. Calcula precios exclusivos desde base de datos (inmune a price tampering).
 * 5. Genera XML UBL 2.1 y firma digital con datos fiscales de SettingsModel.
 * 6. Registra partidas multi-lote en ventas_detalles y actualiza turno en CashModel.
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
      doctorCmp = null,
      recipeFolio = null
    } = req.body;

    // 1. Validaciones defensivas iniciales mediante SaleModel
    SaleModel.validate({
      invoiceType,
      paymentMethod,
      customerDoc,
      customerName,
      items
    });

    const sanitizedRef = paymentReference ? String(paymentReference).trim() : null;
    const activeUserId = (req.user && req.user.id) ? req.user.id : 1;

    // 2. Ejecutar transacción atómica ACID
    const saleResult = await transaction(async (tx) => {
      // 2.1 Obtener turno de caja abierto asignado o turno abierto de mostrador (Obligatorio)
      let shift = await CashModel.getOpenShift({ userId: activeUserId }, tx);
      if (!shift) {
        shift = await CashModel.getOpenShift({}, tx);
      }
      if (!shift) {
        const err = new Error('No existe un turno de caja abierto en este momento. Debe realizar la apertura de caja para registrar ventas.');
        err.statusCode = 400;
        throw err;
      }
      const turnoId = shift.id;

      // 2.2 Generar correlativo atómico con candado transaccional
      const series = SaleModel.SERIES_MAP[invoiceType];
      const { nextNumber, formattedCorrelative } = await SaleModel.getNextCorrelative(series, tx);

      // 2.3 Validar productos, precios oficiales de BD y stock en lotes FEFO
      let calculatedTotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const prod = await ProductModel.findById(item.productId, tx);
        if (!prod) {
          const err = new Error(`Producto con ID ${item.productId} no encontrado en el catálogo.`);
          err.statusCode = 400;
          throw err;
        }

        const qty = parseInt(item.quantity, 10);

        // Validación sanitaria estricta DIGEMID (Psicotrópicos y Estupefacientes Lista IV)
        if (prod.prescription_type === 'retained') {
          const cmp = (item.doctorCmp || doctorCmp || '').toString().trim();
          const folio = (item.recipeFolio || recipeFolio || '').toString().trim();
          if (!cmp || !folio) {
            const err = new Error(
              `Dispensación bloqueada por DIGEMID: El fármaco "${prod.name}" es controlado (Lista IV - Receta Retenida) y exige registrar el CMP del médico y el folio de receta médica.`
            );
            err.statusCode = 400;
            throw err;
          }
        }

        // Determinar fracción solicitada y verificar que el producto esté habilitado para venderse en dicha presentación
        const fraction = item.fractionType || 'unit';
        let officialPrice = 0;
        let fractionLabel = 'unidad';

        if (fraction === 'box') {
          officialPrice = parseFloat(prod.box_price) || 0;
          fractionLabel = 'caja';
        } else if (fraction === 'blister') {
          officialPrice = parseFloat(prod.blister_price) || 0;
          fractionLabel = 'blíster';
        } else {
          officialPrice = parseFloat(prod.unit_price) || 0;
          fractionLabel = 'unidad';
        }

        if (officialPrice <= 0) {
          const err = new Error(
            `El producto "${prod.name}" no está habilitado para venderse por ${fractionLabel}.`
          );
          err.statusCode = 400;
          throw err;
        }

        // =========================================================================
        // 🛡️ BLINDAJE INTEGRAL CONTRA PRICE-TAMPERING (Defensa en Profundidad)
        // =========================================================================
        if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '') {
          const clientPrice = parseFloat(item.unitPrice);
          if (!isNaN(clientPrice) && Math.abs(clientPrice - officialPrice) > 0.01) {
            const err = new Error(
              `Alerta de seguridad (Price-Tampering): Discrepancia detectada en el precio de "${prod.name}". ` +
              `Precio recibido: S/ ${clientPrice.toFixed(2)}, Precio oficial de catálogo: S/ ${officialPrice.toFixed(2)}.`
            );
            err.statusCode = 400;
            throw err;
          }
        }

        // Asignación inmutable desde PostgreSQL
        const price = Math.round(officialPrice * 100) / 100;

        const itemSubtotal = Math.round(price * qty * 100) / 100;
        calculatedTotal += itemSubtotal;

        // Calcular pastillas base necesarias según la fracción
        let baseUnitsNeeded = qty;
        const uPerBox = parseInt(prod.units_per_box, 10) || 100;
        const uPerBlister = parseInt(prod.units_per_blister, 10) || 10;

        if (item.fractionType === 'box') {
          baseUnitsNeeded = qty * uPerBox;
        } else if (item.fractionType === 'blister') {
          baseUnitsNeeded = qty * uPerBlister;
        }

        // Consultar lotes activos vigentes (NO vencidos) con bloqueo de fila FOR UPDATE
        const lots = await ProductModel.getFefoLots(prod.id, tx);
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
          unitsPerBox: uPerBox,
          unitsPerBlister: uPerBlister,
          lots
        });
      }

      calculatedTotal = Math.round(calculatedTotal * 100) / 100;
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

      // 2.4 Cargar datos fiscales reales de la botica desde SettingsModel
      const companyConfig = await SettingsModel.getFiscalConfig(tx);

      // 2.5 Generación de comprobante electrónico UBL 2.1 y Hash SHA-256 (SUNAT)
      let cpeData = null;
      if (invoiceType === 'boleta' || invoiceType === 'factura') {
        try {
          const ublPayload = {
            series,
            correlative: nextNumber,
            invoiceType,
            issueDate: new Date().toISOString().split('T')[0],
            issueTime: new Date().toTimeString().split(' ')[0],
            customer: {
              docType: invoiceType === 'factura' ? '6' : (customerDoc.length === 8 ? '1' : '0'),
              docNumber: customerDoc,
              name: customerName,
              address: 'LIMA, PERU'
            },
            currency: 'PEN',
            company: companyConfig,
            subtotal: subtotalBase,
            igv: igvAmount,
            total: calculatedTotal,
            totalLetters: numberToLetters(calculatedTotal),
            items: validatedItems.map(item => ({
              productId: item.productId,
              name: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.subtotal,
              igv: Math.round((item.subtotal - (item.subtotal / 1.18)) * 100) / 100,
              basePrice: Math.round((item.subtotal / 1.18) * 100) / 100
            }))
          };

          cpeData = generateUBL21(ublPayload, companyConfig);
        } catch (cpeError) {
          console.warn('[SUNAT UBL 2.1] Error en generación de XML:', cpeError.message);
        }
      }

      // 2.6 Insertar cabecera de la venta mediante SaleModel
      const sale = await SaleModel.insertSaleHeader({
        invoiceSeries: series,
        invoiceNumber: nextNumber,
        invoiceType,
        userId: activeUserId,
        turnoId,
        customerDoc,
        customerName: customerName.trim().toUpperCase(),
        paymentMethod,
        subtotal: subtotalBase,
        igv: igvAmount,
        total: calculatedTotal,
        amountPaid: paid,
        changeGiven,
        paymentReference: sanitizedRef,
        hashCpe: cpeData ? cpeData.digestValue : null,
        xmlUbl: cpeData ? cpeData.xml : null
      }, tx);

      // 2.7 Dispensar lotes FEFO y registrar partidas exactas en ventas_detalles
      const dispensedDetails = [];

      for (const item of validatedItems) {
        let remainingToDeduct = item.baseUnitsNeeded;

        for (const lot of item.lots) {
          if (remainingToDeduct <= 0) break;

          const lotUnits = parseInt(lot.stock_units, 10);
          const deductFromThisLot = Math.min(lotUnits, remainingToDeduct);

          // Deducir stock del lote en el modelo de productos
          await ProductModel.deductLotStock(lot.id, deductFromThisLot, item.unitsPerBox, item.unitsPerBlister, tx);

          // Registrar en Kardex físico (auditoría oficial de trazabilidad)
          const newUnits = Math.max(0, lotUnits - deductFromThisLot);
          await tx.run(
            `INSERT INTO kardex (
              product_id, lot_id, movement_type, reference_type, reference_id,
              quantity, unit_type, previous_stock, new_stock, reason, user_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              item.productId,
              lot.id,
              'sale',
              invoiceType.toUpperCase(),
              formattedCorrelative,
              -deductFromThisLot,
              'unit',
              lotUnits,
              newUnits,
              `Venta ${formattedCorrelative} a ${customerName || 'Cliente Varios'}`,
              req.user?.name || 'Personal Farmacia'
            ]
          );

          // Calcular la fracción y precio correspondiente a la porción extraída de este lote
          let partQty = deductFromThisLot;
          let partFraction = 'unit';
          let partPrice = item.unitPrice;

          if (item.fractionType === 'box' && deductFromThisLot % item.unitsPerBox === 0) {
            partQty = deductFromThisLot / item.unitsPerBox;
            partFraction = 'box';
          } else if (item.fractionType === 'blister' && deductFromThisLot % item.unitsPerBlister === 0) {
            partQty = deductFromThisLot / item.unitsPerBlister;
            partFraction = 'blister';
          } else if (item.fractionType === 'box') {
            partPrice = Math.round((item.unitPrice / item.unitsPerBox) * 100) / 100;
          } else if (item.fractionType === 'blister') {
            partPrice = Math.round((item.unitPrice / item.unitsPerBlister) * 100) / 100;
          }

          const partSubtotal = Math.round(partQty * partPrice * 100) / 100;

          // Registrar partida exacta en ventas_detalles mediante SaleModel
          await SaleModel.insertSaleDetail({
            saleId: sale.id,
            productId: item.productId,
            lotId: lot.id,
            fractionType: partFraction,
            quantity: partQty,
            unitPrice: partPrice,
            subtotal: partSubtotal
          }, tx);

          dispensedDetails.push({
            productName: item.productName,
            fractionType: partFraction,
            quantity: partQty,
            unitPrice: partPrice,
            subtotal: partSubtotal,
            lotNumber: lot.lot_number
          });

          remainingToDeduct -= deductFromThisLot;
        }
      }

      // 2.8 Actualizar estado de recetas DIGEMID si aplica (marcar como dispensadas)
      const cleanFolio = (recipeFolio || '').toString().trim();
      if (cleanFolio) {
        await tx.run(`UPDATE recetas_digemid SET status = 'dispensed' WHERE folio = $1`, [cleanFolio]);
      }
      for (const it of validatedItems) {
        if (it.recipeFolio) {
          await tx.run(`UPDATE recetas_digemid SET status = 'dispensed' WHERE folio = $1`, [it.recipeFolio.toString().trim()]);
        }
      }

      // 2.9 Acumulación de Puntos de Fidelización para Clientes Registrados
      if (customerDoc && customerDoc !== '00000000') {
        const pointsEarned = Math.floor(calculatedTotal);
        if (pointsEarned > 0) {
          await tx.run(
            `UPDATE clientes SET points_balance = points_balance + $1, updated_at = NOW() WHERE document_number = $2`,
            [pointsEarned, customerDoc]
          );
        }
      }

      // 2.10 Acumular venta en el turno de caja abierto
      await SaleModel.updateShiftSales(turnoId, calculatedTotal, paymentMethod, tx);

      const totalInWords = cpeData ? cpeData.totalInWords : numberToLetters(calculatedTotal);

      return {
        saleId: sale.id,
        correlative: formattedCorrelative,
        correlativeNumber: formattedCorrelative,
        invoiceNumber: nextNumber,
        invoiceNum: nextNumber,
        invoiceNumberFormatted: formattedCorrelative,
        invoiceSeries: series,
        invoiceType,
        customerDoc,
        customerName: customerName.trim().toUpperCase(),
        paymentMethod,
        subtotal: subtotalBase,
        igv: igvAmount,
        total: calculatedTotal,
        totalInWords,
        amountPaid: paid,
        changeGiven,
        paymentReference: sanitizedRef,
        turnoId,
        cpeStatus: cpeData ? 'GENERATED_UBL21' : 'NO_APLICA_TICKET',
        sunatStatus: cpeData ? 'pending' : 'not_applicable',
        hashCpe: cpeData ? cpeData.digestValue : null,
        xmlUbl: cpeData ? cpeData.xml : null,
        details: dispensedDetails,
        items: dispensedDetails,
        createdAt: sale.created_at
      };
    });

    // Despacho asíncrono a SUNAT en segundo plano (Modo Ticket Rápido: mostrador < 50ms)
    if (saleResult.xmlUbl && ['boleta', 'factura'].includes(saleResult.invoiceType)) {
      SunatWorker.dispatchSaleSunatAsync(saleResult.saleId, saleResult.xmlUbl, saleResult.invoiceNumber);
    }

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Venta registrada con éxito. Comprobante: ${saleResult.invoiceNumber}`,
      data: {
        ...saleResult,
        ticketReady: true,
        xmlUbl: undefined // No saturar el payload de respuesta de mostrador con el XML crudo
      }
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
 * GET /api/sales
 * Historial de comprobantes emitidos con filtros y soporte de paginación
 */
async function getSales(req, res, next) {
  try {
    const { date, invoiceType, status, userId, limit = 50, page } = req.query;
    const isPaginated = page !== undefined;

    const result = await SaleModel.getSalesList({
      date,
      invoiceType,
      status,
      userId,
      limit,
      page
    });

    if (isPaginated) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        count: result.data.length,
        pagination: result.pagination,
        data: result.data
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sales/:id
 * Consulta de comprobante completo con sus partidas desglosadas por lote
 */
async function getSaleById(req, res, next) {
  try {
    const saleId = req.params.id;
    const sale = await SaleModel.getSaleById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Comprobante de venta #${saleId} no encontrado.`
      });
    }

    const details = await SaleModel.getSaleDetails(saleId);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        ...sale,
        correlative: sale.invoiceNumberFormatted || sale.correlative,
        items: details,
        details
      }
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
 * POST /api/sales/:id/cancel
 * Anular venta y restituir stock en lotes FEFO y saldo en turno de caja (ACID)
 */
async function cancelSale(req, res, next) {
  try {
    const saleId = req.params.id;

    const cancelResult = await transaction(async (tx) => {
      // 1. Obtener y verificar venta
      const sale = await SaleModel.getSaleById(saleId, tx);
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
      const items = await SaleModel.getSaleDetails(saleId, tx);

      // 3. Restituir stock exacto lote por lote en lotes_fefo
      for (const item of items) {
        const qty = parseInt(item.quantity, 10) || 0;
        const uPerBox = parseInt(item.unitsPerBox, 10) || 100;
        const uPerBlister = parseInt(item.unitsPerBlister, 10) || 10;

        let baseUnitsToRestore = qty;
        if (item.fractionType === 'box') {
          baseUnitsToRestore = qty * uPerBox;
        } else if (item.fractionType === 'blister') {
          baseUnitsToRestore = qty * uPerBlister;
        }

        if (item.lotId) {
          const lot = await tx.get('SELECT * FROM lotes_fefo WHERE id = $1 FOR UPDATE', [item.lotId]);
          if (lot) {
            const lotStock = parseInt(lot.stock_units, 10);
            await ProductModel.restoreLotStock(item.lotId, baseUnitsToRestore, uPerBox, uPerBlister, tx);

            // Registrar devolución formal en Kardex
            await tx.run(
              `INSERT INTO kardex (
                product_id, lot_id, movement_type, reference_type, reference_id,
                quantity, unit_type, previous_stock, new_stock, reason, user_name
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                item.productId,
                lot.id,
                'sale_cancellation',
                sale.invoiceType.toUpperCase(),
                sale.invoiceNumberFormatted,
                baseUnitsToRestore,
                'unit',
                lotStock,
                lotStock + baseUnitsToRestore,
                `Anulación de venta ${sale.invoiceNumberFormatted}`,
                req.user?.name || 'Administrador'
              ]
            );
          }
        }
      }

      // 4. Revertir saldo en el turno de caja
      if (sale.turnoId) {
        await SaleModel.revertShiftSales(sale.turnoId, sale.total, sale.paymentMethod, tx);
      }

      // 5. Revocar puntos acumulados por la venta cancelada
      const doc = sale.customerDoc || sale.customer_doc;
      if (doc && doc !== '00000000') {
        const pointsToRevoke = Math.floor(parseFloat(sale.total));
        if (pointsToRevoke > 0) {
          await tx.run(
            `UPDATE clientes SET points_balance = GREATEST(0, points_balance - $1), updated_at = NOW() WHERE document_number = $2`,
            [pointsToRevoke, doc]
          );
        }
      }

      // 6. Marcar venta como anulada en el modelo
      await SaleModel.cancelSaleHeader(saleId, tx);

      return {
        saleId: sale.id,
        correlative: sale.invoiceNumberFormatted,
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
 * GET /api/sales/sunat/pending
 * Obtener listado de comprobantes pendientes de sincronizar o en cola de reintento SUNAT
 */
async function getPendingSunat(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || 20, 10);
    const pending = await SaleModel.getPendingSunatSales(limit);

    res.status(200).json({
      success: true,
      statusCode: 200,
      count: pending.length,
      data: pending
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sales/:id/sunat/retry
 * Reintentar transmisión manual de un comprobante específico a SUNAT
 */
async function retrySaleSunat(req, res, next) {
  try {
    const saleId = req.params.id;
    const sale = await SaleModel.getSaleById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Comprobante de venta #${saleId} no encontrado.`
      });
    }

    if (!sale.xmlUbl) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Esta venta no cuenta con comprobante electrónico UBL 2.1 emitido (es ticket interno).'
      });
    }

    // Despacho asíncrono
    SunatWorker.dispatchSaleSunatAsync(sale.id, sale.xmlUbl, sale.invoiceNumberFormatted);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Reintento de transmisión iniciado para comprobante ${sale.invoiceNumberFormatted}.`,
      data: {
        saleId: sale.id,
        correlative: sale.invoiceNumberFormatted,
        status: 'dispatching'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sales/sunat/sync
 * Sincronizar en lote todos los comprobantes pendientes o con fallo temporal de conexión
 */
async function syncPendingSunat(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || 15, 10);
    const summary = await SunatWorker.syncPendingSales(limit);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Sincronización por lote finalizada. Procesados: ${summary.processed}, Aceptados: ${summary.accepted}, Errores/Reintentos: ${summary.errors}`,
      data: summary
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  getPendingSunat,
  retrySaleSunat,
  syncPendingSunat
};
