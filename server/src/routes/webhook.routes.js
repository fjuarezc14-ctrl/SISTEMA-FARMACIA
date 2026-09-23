const express = require('express');
const crypto = require('crypto');

const router = express.Router();

/**
 * Middleware para validar la firma criptográfica o token secreto del Webhook POS
 * Compatible con cabeceras de Niubiz (x-signature) e Izipay (x-webhook-token / Authorization)
 */
function verifyWebhookSignature(req, res, next) {
  const secretKey = process.env.POS_WEBHOOK_SECRET || 'valetec_pos_webhook_secret_key_2026_xyz';
  
  // Extraer token de firma de las cabeceras comunes
  const incomingSignature = req.headers['x-signature'] || 
                            req.headers['x-webhook-token'] || 
                            req.headers['x-pos-token'] ||
                            req.headers['authorization'];

  if (!incomingSignature) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED_WEBHOOK',
      message: 'Cabecera de firma de seguridad requerida (x-signature o x-webhook-token).'
    });
  }

  // Sanitizar formato Bearer si viene en Authorization
  const rawToken = incomingSignature.replace(/^Bearer\s+/i, '').trim();

  try {
    const bufferIncoming = Buffer.from(rawToken, 'utf8');
    const bufferSecret = Buffer.from(secretKey, 'utf8');

    // Comparación en tiempo constante (evita ataques de temporización por análisis de canal lateral)
    if (bufferIncoming.length !== bufferSecret.length || !crypto.timingSafeEqual(bufferIncoming, bufferSecret)) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Firma de autenticación de pasarela POS no válida.'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Fallo al verificar firma criptográfica del webhook.'
    });
  }
}

/**
 * POST /api/webhooks/payment
 * Endpoint seguro para notificaciones de pago asíncronas desde terminales físicos POS (Niubiz / Izipay)
 */
router.post('/payment', verifyWebhookSignature, (req, res) => {
  const {
    transactionId,
    orderId,
    ticketNumber,
    status,
    amount,
    currency = 'PEN',
    cardBrand,
    lastFourDigits,
    authorizationCode,
    provider = 'Niubiz/Izipay POS'
  } = req.body;

  // Validación de campos mínimos obligatorios
  if (!transactionId || (!orderId && !ticketNumber) || !status) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Faltan campos esenciales en el payload del POS (transactionId, orderId, status).'
    });
  }

  // Normalización de estados del POS
  const normalizedStatus = String(status).toUpperCase();
  let finalState = 'PENDING';

  if (['APPROVED', 'SUCCESS', '00', 'PAID', 'AUTORIZADO'].includes(normalizedStatus)) {
    finalState = 'APPROVED';
  } else if (['REJECTED', 'DECLINED', 'DENEGADO', 'FAILED'].includes(normalizedStatus)) {
    finalState = 'REJECTED';
  } else if (['CANCELLED', 'ANULADO', 'EXPIRED'].includes(normalizedStatus)) {
    finalState = 'CANCELLED';
  }

  // Registro de auditoría estructurado
  console.log(`[POS Webhook Event] Provider: ${provider} | TxID: ${transactionId} | Order: ${orderId || ticketNumber} | Status: ${finalState} | Amount: ${currency} ${amount || 0}`);

  return res.status(200).json({
    success: true,
    message: 'Evento de notificación POS procesado y registrado con éxito.',
    data: {
      eventId: `EVT-${Date.now()}`,
      transactionId,
      orderId: orderId || ticketNumber,
      authorizationCode: authorizationCode || 'AUTH-OK',
      cardBrand: cardBrand || 'VISA/MASTERCARD',
      status: finalState,
      amount: parseFloat(amount || 0),
      currency,
      receivedAt: new Date().toISOString()
    }
  });
});

/**
 * GET /api/webhooks/payment/status
 * Ruta de comprobación de salud para el sistema de webhooks
 */
router.get('/payment/status', (req, res) => {
  res.status(200).json({
    service: 'VALETEC POS Webhook Gateway',
    status: 'ACTIVE',
    supportedGateways: ['Niubiz', 'Izipay', 'Yape Business', 'Plin POS'],
    endpoint: '/api/webhooks/payment',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
