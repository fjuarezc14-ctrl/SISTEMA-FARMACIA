const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: CASH (CONTROL DE CAJA, MOVIMIENTOS Y CIERRE Z)
 * ============================================================================
 * Representa los turnos de caja en gaveta, egresos/ingresos menores de caja chica
 * y el arqueo oficial con Cierre Z.
 */
class CashModel {
  /**
   * Tipos de movimiento de caja chica permitidos
   */
  static MOVEMENT_TYPES = ['egreso', 'ingreso'];

  /**
   * Validaciones defensivas de integridad para los movimientos de caja chica.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validateMovement(data) {
    const errors = [];

    // 1. Tipo de movimiento
    if (!data.type || !CashModel.MOVEMENT_TYPES.includes(data.type)) {
      errors.push(`El tipo de movimiento debe ser uno de los siguientes: ${CashModel.MOVEMENT_TYPES.join(', ')}.`);
    }

    // 2. Monto
    const amt = parseFloat(data.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.push('El monto del movimiento debe ser un número estrictamente mayor a cero.');
    }

    // 3. Concepto
    if (!data.concept || typeof data.concept !== 'string') {
      errors.push('El concepto o motivo del movimiento es obligatorio.');
    } else {
      const cleanConcept = data.concept.trim();
      if (cleanConcept.length < 3 || cleanConcept.length > 255) {
        errors.push('El concepto debe tener entre 3 y 255 caracteres.');
      }
    }

    // 4. Responsable
    if (!data.responsible || typeof data.responsible !== 'string') {
      errors.push('El nombre del responsable que autoriza el movimiento es obligatorio.');
    } else {
      const cleanResp = data.responsible.trim();
      if (cleanResp.length < 2 || cleanResp.length > 100) {
        errors.push('El nombre del responsable debe tener entre 2 y 100 caracteres.');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Validaciones defensivas para la apertura de turno de caja.
   */
  static validateOpenShift(data) {
    const errors = [];

    const userId = parseInt(data.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      errors.push('Debe especificarse un usuario/cajero válido.');
    }

    const openBal = parseFloat(data.openingBalance);
    if (isNaN(openBal) || openBal < 0) {
      errors.push('El saldo inicial (sencillo de apertura) debe ser un número mayor o igual a cero.');
    }

    if (data.terminal && typeof data.terminal === 'string' && data.terminal.trim().length > 50) {
      errors.push('El identificador de terminal no puede exceder los 50 caracteres.');
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Validaciones defensivas para el Cierre Z de turno.
   */
  static validateCloseZ(data) {
    const counted = parseFloat(data.countedBalance);
    if (isNaN(counted) || counted < 0) {
      const err = new Error('El monto físico recontado en gaveta debe ser un número mayor o igual a cero.');
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
      const err = new Error('El ID debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener el turno de caja abierto asignado. Prioriza shiftId específico o userId del cajero.
   * Resuelve concurrencia de turnos simultáneos (Error 6).
   * @param {Object} criteria - { shiftId, userId }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async getOpenShift({ shiftId, userId } = {}, dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    if (shiftId) {
      const validShiftId = parseInt(shiftId, 10);
      if (!isNaN(validShiftId) && validShiftId > 0) {
        return await getFn(`
          SELECT t.*, u.name as cashier_name, u.email as cashier_email 
          FROM caja_turnos t 
          LEFT JOIN usuarios u ON t.user_id = u.id 
          WHERE t.id = $1 AND t.status = 'open';
        `, [validShiftId]);
      }
      return null;
    }

    if (userId) {
      const validUserId = parseInt(userId, 10);
      if (!isNaN(validUserId) && validUserId > 0) {
        return await getFn(`
          SELECT t.*, u.name as cashier_name, u.email as cashier_email 
          FROM caja_turnos t 
          LEFT JOIN usuarios u ON t.user_id = u.id 
          WHERE t.user_id = $1 AND t.status = 'open' 
          ORDER BY t.id DESC 
          LIMIT 1;
        `, [validUserId]);
      }
      return null;
    }

    // Fallback: Cualquier turno abierto en el sistema
    return await getFn(`
      SELECT t.*, u.name as cashier_name, u.email as cashier_email 
      FROM caja_turnos t 
      LEFT JOIN usuarios u ON t.user_id = u.id 
      WHERE t.status = 'open' 
      ORDER BY t.id DESC 
      LIMIT 1;
    `);
  }

  /**
   * Buscar un turno de caja por su ID.
   * @param {number|string} id - ID del turno.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async getShiftById(id, dbClient) {
    const validId = CashModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT t.*, u.name as cashier_name, u.email as cashier_email 
      FROM caja_turnos t 
      LEFT JOIN usuarios u ON t.user_id = u.id 
      WHERE t.id = $1;
    `, [validId]);
  }

  /**
   * Obtener movimientos de caja chica (egresos e ingresos) asociados a un turno.
   * @param {number|string} turnoId - ID del turno.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getMovements(turnoId, dbClient) {
    const validId = CashModel.validateId(turnoId);
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        id,
        turno_id AS "turnoId",
        type,
        CAST(amount AS FLOAT) AS amount,
        concept,
        responsible,
        created_at AS "createdAt"
      FROM caja_movimientos 
      WHERE turno_id = $1 
      ORDER BY id DESC;
    `, [validId]);
  }

  /**
   * Obtener el resumen consolidado de ventas del turno para el arqueo.
   * @param {number|string} turnoId - ID del turno.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>}
   */
  static async getSalesSummary(turnoId, dbClient) {
    const validId = CashModel.validateId(turnoId);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        COUNT(*)::int as total_vouchers,
        COALESCE(SUM(CASE WHEN invoice_type = 'ticket' THEN 1 ELSE 0 END), 0)::int as tickets_count,
        COALESCE(SUM(CASE WHEN invoice_type = 'boleta' THEN 1 ELSE 0 END), 0)::int as boletas_count,
        COALESCE(SUM(CASE WHEN invoice_type = 'factura' THEN 1 ELSE 0 END), 0)::int as facturas_count,
        CAST(COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) AS FLOAT) as cash_total,
        CAST(COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) AS FLOAT) as digital_total,
        CAST(COALESCE(SUM(total), 0) AS FLOAT) as grand_total
      FROM ventas 
      WHERE turno_id = $1 AND status = 'completed';
    `, [validId]);
  }

  /**
   * Verificar si un usuario o una terminal ya tienen un turno abierto.
   * @param {number|string} userId - ID del usuario.
   * @param {string} terminal - Identificador de terminal.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>} Turno colisionante o null.
   */
  static async hasOpenShift(userId, terminal, dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT id, user_id, terminal 
      FROM caja_turnos 
      WHERE (user_id = $1 OR terminal = $2) AND status = 'open'
      LIMIT 1;
    `, [userId, terminal]);
  }

  /**
   * Abrir un nuevo turno de caja en PostgreSQL.
   * @param {Object} data - { userId, terminal, openingBalance }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Turno abierto.
   */
  static async openShift(data, dbClient) {
    CashModel.validateOpenShift(data);

    const userId = parseInt(data.userId, 10);
    const terminal = data.terminal ? data.terminal.trim() : 'Caja 01';
    const openBal = parseFloat(data.openingBalance);

    // 1. Verificar que ni el cajero ni la terminal tengan ya un turno abierto
    const existing = await CashModel.hasOpenShift(userId, terminal, dbClient);
    if (existing) {
      if (existing.user_id === userId) {
        const err = new Error('Ya tienes un turno de caja abierto actualmente. Debes realizar el Cierre Z antes de abrir otro.');
        err.statusCode = 400;
        throw err;
      } else {
        const err = new Error(`La terminal "${terminal}" ya tiene un turno abierto por otro colaborador.`);
        err.statusCode = 400;
        throw err;
      }
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      INSERT INTO caja_turnos (
        user_id, terminal, opening_balance, cash_sales, digital_sales, expenses, expected_balance, status, opened_at
      )
      VALUES ($1, $2, $3, 0.00, 0.00, 0.00, $3, 'open', NOW())
      RETURNING *;
    `, [userId, terminal, openBal]);
  }

  /**
   * Registrar movimiento de caja chica (egreso o ingreso) y actualizar saldos de caja.
   * @param {Object} data - { turnoId, type, amount, concept, responsible }
   * @param {Object} clientTx - Cliente transaccional.
   * @returns {Promise<Object>} Movimiento registrado.
   */
  static async addMovement(data, clientTx) {
    CashModel.validateMovement(data);
    const validTurnoId = CashModel.validateId(data.turnoId);

    const getFn = (clientTx && clientTx.get) ? clientTx.get.bind(clientTx) : get;
    const runFn = (clientTx && clientTx.run) ? clientTx.run.bind(clientTx) : run;

    const amt = parseFloat(data.amount);
    const isExpense = data.type === 'egreso';

    // 1. Insertar registro en caja_movimientos
    const movement = await getFn(`
      INSERT INTO caja_movimientos (turno_id, type, amount, concept, responsible, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `, [
      validTurnoId,
      data.type,
      amt,
      data.concept.trim(),
      data.responsible.trim()
    ]);

    // 2. Actualizar balance esperado y egresos acumulados en caja_turnos
    if (isExpense) {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          expenses = expenses + $1,
          expected_balance = expected_balance - $1
        WHERE id = $2;
      `, [amt, validTurnoId]);
    } else {
      await runFn(`
        UPDATE caja_turnos 
        SET 
          expected_balance = expected_balance + $1
        WHERE id = $2;
      `, [amt, validTurnoId]);
    }

    return movement;
  }

  /**
   * Ejecutar Arqueo Z oficial y sellar el turno de caja.
   * @param {Object} data - { shiftId, countedBalance }
   * @param {Object} clientTx - Cliente transaccional.
   * @returns {Promise<Object>} Datos consolidados del turno cerrado con arqueo.
   */
  static async closeZ({ shiftId, countedBalance }, clientTx) {
    const validShiftId = CashModel.validateId(shiftId);
    CashModel.validateCloseZ({ countedBalance });

    const getFn = (clientTx && clientTx.get) ? clientTx.get.bind(clientTx) : get;

    // 1. Obtener estado actual del turno
    const shift = await CashModel.getShiftById(validShiftId, clientTx);
    if (!shift) {
      const err = new Error(`El turno de caja #${validShiftId} no existe.`);
      err.statusCode = 404;
      throw err;
    }

    if (shift.status !== 'open') {
      const err = new Error('Este turno de caja ya se encuentra cerrado con Cierre Z.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Cálculo matemático de descuadre
    const counted = parseFloat(countedBalance);
    const expected = parseFloat(shift.expected_balance);
    const difference = Math.round((counted - expected) * 100) / 100;

    // 3. Sellar turno en PostgreSQL
    return await getFn(`
      UPDATE caja_turnos 
      SET 
        counted_balance = $1,
        difference = $2,
        status = 'closed_z',
        closed_at = NOW()
      WHERE id = $3
      RETURNING *;
    `, [counted, difference, validShiftId]);
  }
}

module.exports = CashModel;
