/**
 * ============================================================================
 * VALETEC PHARMA - WORKER DE FACTURACIÓN ELECTRÓNICA SUNAT ASÍNCRONA
 * ============================================================================
 * Desacopla el mostrador (POS) del tiempo de respuesta y caídas de SUNAT.
 * Permite emitir el ticket de venta en < 50ms con estado 'pending',
 * procesando la firma digital y envío SOAP en segundo plano con reintentos.
 * ============================================================================
 */

const { sunatService } = require('./sunat.service');
const SaleModel = require('../models/sale.model');
const SettingsModel = require('../models/settings.model');

class SunatWorker {
  /**
   * Despacha un comprobante electrónico a SUNAT de forma asíncrona sin bloquear el POS.
   * @param {number|string} saleId - ID de la venta en base de datos.
   * @param {string} xmlUbl - Documento XML UBL 2.1 generado.
   * @param {string} correlative - Identificador de comprobante (ej: 'B001-00004812').
   * @param {Object} [companyConfig] - Configuración fiscal del emisor.
   */
  static dispatchSaleSunatAsync(saleId, xmlUbl, correlative, companyConfig = null) {
    // Ejecución no bloqueante en el siguiente ciclo del Event Loop
    setImmediate(async () => {
      try {
        const config = companyConfig || await SettingsModel.getFiscalConfig();
        console.log(`[SUNAT ASYNC] Iniciando transmisión en segundo plano para ${correlative} (Venta #${saleId})...`);

        // Transmisión SOAP a SUNAT
        const soapResult = await sunatService.sendBillSoap(xmlUbl, correlative, config);

        if (soapResult && soapResult.status === 'ACCEPTED') {
          await SaleModel.updateSunatStatus(saleId, {
            status: 'accepted',
            response: soapResult.message || 'Comprobante aceptado por SUNAT con éxito.',
            ticket: soapResult.code || '0'
          });
          console.log(`[SUNAT ASYNC] ✅ ${correlative} ACEPTADO por SUNAT.`);
        } else if (soapResult && soapResult.status === 'OBSERVED') {
          await SaleModel.updateSunatStatus(saleId, {
            status: 'observed',
            response: soapResult.message || 'Comprobante aceptado con observaciones por SUNAT.',
            ticket: soapResult.code
          });
          console.warn(`[SUNAT ASYNC] ⚠️ ${correlative} OBSERVADO por SUNAT: ${soapResult.message}`);
        } else {
          await SaleModel.updateSunatStatus(saleId, {
            status: 'rejected',
            response: (soapResult && soapResult.message) ? soapResult.message : 'Rechazado por validador SUNAT.'
          });
          console.error(`[SUNAT ASYNC] ❌ ${correlative} RECHAZADO por SUNAT.`);
        }
      } catch (err) {
        // En caso de caída de SUNAT, timeout o corte de red local:
        // No se pierde la venta, se marca para reintento automático.
        console.warn(`[SUNAT ASYNC] ⏳ Servidor SUNAT no disponible o timeout para ${correlative}. Encolado para reintento.`);
        try {
          await SaleModel.updateSunatStatus(saleId, {
            status: 'pending_retry',
            response: `[Intento 1/5] En cola de reintento automático. Error temporal: ${err.message}`
          });
        } catch (dbErr) {
          console.error(`[SUNAT ASYNC] Error actualizando estado de venta #${saleId}:`, dbErr.message);
        }
      }
    });
  }

  /**
   * Sincronizar por lote comprobantes pendientes o con fallo temporal de conexión.
   * @param {number} [limit=10] - Máximo número de comprobantes a sincronizar en este lote.
   * @returns {Promise<Object>} Resumen del procesamiento del lote.
   */
  static async syncPendingSales(limit = 10) {
    const pending = await SaleModel.getPendingSunatSales(limit);
    const summary = {
      totalFound: pending.length,
      processed: 0,
      accepted: 0,
      errors: 0,
      details: []
    };

    if (pending.length === 0) {
      return summary;
    }

    const companyConfig = await SettingsModel.getFiscalConfig();

    for (const sale of pending) {
      const correlative = `${sale.invoiceSeries}-${String(sale.invoiceNumber).padStart(6, '0')}`;
      summary.processed++;

      try {
        if (!sale.xmlUbl) {
          throw new Error('Comprobante no cuenta con XML UBL 2.1 almacenado.');
        }

        const soapResult = await sunatService.sendBillSoap(sale.xmlUbl, correlative, companyConfig);

        if (soapResult && (soapResult.status === 'ACCEPTED' || soapResult.status === 'OBSERVED')) {
          const finalStatus = soapResult.status === 'ACCEPTED' ? 'accepted' : 'observed';
          await SaleModel.updateSunatStatus(sale.id, {
            status: finalStatus,
            response: soapResult.message,
            ticket: soapResult.code || '0'
          });
          summary.accepted++;
          summary.details.push({ saleId: sale.id, correlative, status: finalStatus });
        } else {
          await SaleModel.updateSunatStatus(sale.id, {
            status: 'rejected',
            response: (soapResult && soapResult.message) ? soapResult.message : 'Rechazado por SUNAT.'
          });
          summary.errors++;
          summary.details.push({ saleId: sale.id, correlative, status: 'rejected' });
        }
      } catch (err) {
        summary.errors++;
        const previousAttemptsMatch = (sale.sunatResponse || '').match(/\[Intento (\d+)\/5\]/);
        const currentAttempt = previousAttemptsMatch ? parseInt(previousAttemptsMatch[1], 10) + 1 : 1;
        const maxReached = currentAttempt >= 5;

        const newStatus = maxReached ? 'rejected' : 'pending_retry';
        const failMessage = maxReached
          ? `Límite de reintentos alcanzado (5/5). Fallo permanente: ${err.message}`
          : `[Intento ${currentAttempt}/5] Reintento fallido: ${err.message}`;

        await SaleModel.updateSunatStatus(sale.id, {
          status: newStatus,
          response: failMessage
        });
        summary.details.push({ saleId: sale.id, correlative, status: newStatus, error: err.message, attempt: currentAttempt });
      }
    }

    return summary;
  }
}

module.exports = SunatWorker;
