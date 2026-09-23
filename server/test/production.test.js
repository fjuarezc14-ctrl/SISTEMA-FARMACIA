const assert = require('assert');
const sunatService = require('../services/sunatService');
const http = require('http');

console.log('🧪 Ejecutando pruebas unitarias de Producción (Fase 100%)...\n');

// Test 1: SUNAT UBL 2.1 Generator & Number-to-letters
console.log('1. Probando servicio SUNAT UBL 2.1...');
const letras1 = sunatService.numberToLetters(142.50);
console.log('   Monto en letras (142.50):', letras1);
assert.strictEqual(letras1, 'CIENTO CUARENTA Y DOS CON 50/100 SOLES');

const letras2 = sunatService.numberToLetters(1000.00);
console.log('   Monto en letras (1000.00):', letras2);
assert.strictEqual(letras2, 'MIL CON 00/100 SOLES');

const sampleSale = {
  cpeId: 'B001-00004812',
  voucherType: 'boleta',
  customerDoc: '74819203',
  customerName: 'JUAN ALBERTO TORRES',
  items: [
    { productName: 'Paracetamol 500mg', qty: 2, price: 5.00, frac: 'box' },
    { productName: 'Amoxicilina 500mg', qty: 1, price: 15.00, frac: 'box' }
  ],
  total: 25.00
};

const xmlResult = sunatService.buildInvoiceXml(sampleSale);
assert.ok(xmlResult.xml.includes('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>'), 'Debe incluir versión UBL 2.1');
assert.ok(xmlResult.xml.includes('<cbc:ID>B001-00004812</cbc:ID>'), 'Debe incluir el identificador de boleta');
assert.ok(xmlResult.xml.includes('<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>'), 'Tipo CPE debe ser 03 para Boleta');
assert.ok(xmlResult.hashDigest.length > 0, 'Debe calcular el DigestValue SHA-256');
console.log('   DigestValue SHA-256:', xmlResult.hashDigest);

sunatService.signXml(xmlResult.xml).then(signedRes => {
  assert.strictEqual(signedRes.success, true);
  console.log('   Firma digital simulada exitosa:', signedRes.mode);

  return sunatService.sendBillSoap(signedRes.signedXml, 'B001-00004812');
}).then(soapRes => {
  assert.strictEqual(soapRes.sunatResponse.code, '0');
  console.log('   Respuesta SOAP SUNAT:', soapRes.sunatResponse.status, '-', soapRes.sunatResponse.description);
  console.log('✅ Servicio SUNAT UBL 2.1 validado con éxito.\n');

  // Test 2: Webhooks POS Endpoint
  console.log('2. Probando endpoint de Webhooks POS...');
  const app = require('../src/app');
  const server = app.listen(0, () => {
    const port = server.address().port;

    // 2.1 Test sin firma -> debe devolver 401
    const req1 = http.request({
      hostname: 'localhost',
      port,
      path: '/api/webhooks/payment',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      assert.strictEqual(res.statusCode, 401, 'Debe rechazar peticiones sin firma');
      console.log('   ✓ Rechazo correcto sin firma (HTTP 401)');

      // 2.2 Test con firma válida
      const validSecret = process.env.POS_WEBHOOK_SECRET || 'valetec_pos_webhook_secret_key_2026_xyz';
      const postData = JSON.stringify({
        transactionId: 'TX-POS-984210',
        orderId: 'ORD-2026-904',
        status: 'APPROVED',
        amount: 85.50,
        currency: 'PEN',
        cardBrand: 'VISA',
        authorizationCode: '049281'
      });

      const req2 = http.request({
        hostname: 'localhost',
        port,
        path: '/api/webhooks/payment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSecret,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res2) => {
        assert.strictEqual(res2.statusCode, 200, 'Debe procesar peticiones con firma válida');
        let body = '';
        res2.on('data', chunk => body += chunk);
        res2.on('end', () => {
          const parsed = JSON.parse(body);
          assert.strictEqual(parsed.success, true);
          assert.strictEqual(parsed.data.status, 'APPROVED');
          console.log('   ✓ Notificación POS aprobada correctamente (HTTP 200):', parsed.data.transactionId);
          console.log('✅ Webhooks POS validados con éxito.\n');
          server.close(() => {
            console.log('🎉 TODAS LAS PRUEBAS DE PRODUCCIÓN COMPLETADAS AL 100%.');
            process.exit(0);
          });
        });
      });

      req2.write(postData);
      req2.end();
    });

    req1.write(JSON.stringify({ transactionId: 'test' }));
    req1.end();
  });
}).catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
