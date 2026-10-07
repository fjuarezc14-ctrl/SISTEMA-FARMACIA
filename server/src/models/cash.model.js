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
  static async getOpenShift({ shiftId, userId, isAdmin, adminUserId } = {}, dbClient) {
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

    if (userId && !isAdmin && !adminUserId) {
      const validUserId = parseInt(userId, 10);
      if (!isNaN(validUserId) && validUserId > 0) {
        const userShift = await getFn(`
          SELECT t.*, u.name as cashier_name, u.email as cashier_email 
          FROM caja_turnos t 
          LEFT JOIN usuarios u ON t.user_id = u.id 
          WHERE t.user_id = $1 AND t.status = 'open' 
          ORDER BY t.id DESC 
          LIMIT 1;
        `, [validUserId]);
        if (userShift) return userShift;
      }
    }

    if (isAdmin || adminUserId) {
      const preferredUserId = parseInt(adminUserId || userId || 0, 10) || 0;
      return await getFn(`
        SELECT t.*, u.name as cashier_name, u.email as cashier_email 
        FROM caja_turnos t 
        LEFT JOIN usuarios u ON t.user_id = u.id 
        WHERE t.status = 'open' 
        ORDER BY CASE WHEN t.user_id = $1 THEN 0 ELSE 1 END, t.id DESC 
        LIMIT 1;
      `, [preferredUserId]);
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
        CAST(COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN (amount_paid - change_given) ELSE 0 END), 0) AS FLOAT) as cash_total,
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

  /**
   * Obtener historial de turnos cerrados con Cierre Z oficial
   * @param {number} limit - Límite de registros (por defecto 50).
   * @param {Object} dbClient - Cliente de base de datos opcional.
   * @returns {Promise<Array>} Lista de turnos cerrados ordenados descendentemente.
   */
  static async getShiftsHistory(limit = 50, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    return await queryFn(`
      SELECT 
        ct.id,
        ct.terminal,
        CAST(ct.opening_balance AS FLOAT) AS "openingBalance",
        CAST(ct.cash_sales AS FLOAT) AS "cashSales",
        CAST(ct.digital_sales AS FLOAT) AS "digitalSales",
        CAST(ct.expenses AS FLOAT) AS "expenses",
        CAST(ct.expected_balance AS FLOAT) AS "expectedBalance",
        CAST(ct.counted_balance AS FLOAT) AS "countedBalance",
        CAST(ct.difference AS FLOAT) AS "difference",
        ct.status,
        TO_CHAR(ct.opened_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD HH24:MI:SS') AS "openedAt",
        TO_CHAR(ct.closed_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD HH24:MI:SS') AS "closedAt",
        COALESCE(u.name, 'Cajero de Turno') AS "cashierName"
      FROM caja_turnos ct
      LEFT JOIN usuarios u ON ct.user_id = u.id
      WHERE ct.status = 'closed_z'
      ORDER BY ct.id DESC
      LIMIT $1;
    `, [limit]);
  }

  /**
   * Obtener lista de Cajas Registradoras / Terminales POS configuradas
   * @param {boolean} [onlyActive=true] - Filtrar solo las activas
   * @param {Object} [dbClient] - Cliente de base de datos opcional
   * @returns {Promise<Array>} Lista de cajas
   */
  static async getTerminals(onlyActive = true, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    try {
      const whereClause = onlyActive ? 'WHERE cr.is_active = true' : '';
      const sql = `
        SELECT 
          cr.id, 
          cr.name, 
          cr.description, 
          cr.is_active AS "isActive", 
          cr.created_at AS "createdAt",
          (CASE WHEN ct.id IS NOT NULL THEN true ELSE false END) AS "inUse",
          ct.id AS "activeShiftId",
          u.name AS "activeCashierName"
        FROM cajas_registradoras cr
        LEFT JOIN caja_turnos ct ON LOWER(ct.terminal) = LOWER(cr.name) AND ct.status = 'open'
        LEFT JOIN usuarios u ON ct.user_id = u.id
        ${whereClause}
        ORDER BY cr.id ASC;
      `;
      const rows = await queryFn(sql);
      if (rows && rows.length > 0) return rows;
      return [
        { id: 1, name: 'Caja 01', description: 'Mostrador Principal', isActive: true, inUse: false },
        { id: 2, name: 'Caja 02', description: 'Turno Noche / Rápida', isActive: true, inUse: false }
      ];
    } catch (e) {
      return [
        { id: 1, name: 'Caja 01', description: 'Mostrador Principal', isActive: true, inUse: false },
        { id: 2, name: 'Caja 02', description: 'Turno Noche / Rápida', isActive: true, inUse: false }
      ];
    }
  }

  /**
   * Registrar una nueva Caja Registradora / Terminal POS
   * @param {Object} data - { name, description }
   * @param {Object} [dbClient] - Cliente de base de datos opcional
   * @returns {Promise<Object>} Caja creada
   */
  static async createTerminal(data = {}, dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const cleanName = data.name ? String(data.name).trim() : '';
    const cleanDesc = data.description ? String(data.description).trim() : null;

    if (!cleanName || cleanName.length < 2 || cleanName.length > 50) {
      const err = new Error('El nombre de la caja registradora debe tener entre 2 y 50 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    // Verificar si ya existe una caja con ese nombre
    const existing = await getFn(`SELECT id FROM cajas_registradoras WHERE LOWER(name) = LOWER($1) LIMIT 1`, [cleanName]);
    if (existing) {
      const err = new Error(`Ya existe una caja registradora con el nombre "${cleanName}".`);
      err.statusCode = 400;
      throw err;
    }

    return await getFn(`
      INSERT INTO cajas_registradoras (name, description, is_active)
      VALUES ($1, $2, true)
      RETURNING id, name, description, is_active AS "isActive", created_at AS "createdAt";
    `, [cleanName, cleanDesc]);
  }

  /**
   * Actualizar nombre, descripción o estado de una Caja Registradora
   * @param {number} id - Identificador de la caja
   * @param {Object} data - { name, description, isActive }
   * @param {Object} [dbClient] - Cliente transaccional opcional
   */
  static async updateTerminal(id, data = {}, dbClient) {
    const termId = parseInt(id, 10);
    if (isNaN(termId) || termId <= 0) {
      const err = new Error('Identificador de caja registradora inválido.');
      err.statusCode = 400;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    const existing = await getFn(`SELECT id, name, description, is_active FROM cajas_registradoras WHERE id = $1`, [termId]);
    if (!existing) {
      const err = new Error(`No se encontró la caja registradora con ID ${termId}.`);
      err.statusCode = 404;
      throw err;
    }

    const newName = (data.name !== undefined) ? String(data.name).trim() : existing.name;
    const newDesc = (data.description !== undefined) ? (data.description ? String(data.description).trim() : null) : existing.description;
    const newActive = (data.isActive !== undefined) ? Boolean(data.isActive) : (data.is_active !== undefined ? Boolean(data.is_active) : existing.is_active);

    if (!newName || newName.length < 2 || newName.length > 50) {
      const err = new Error('El nombre de la caja registradora debe tener entre 2 y 50 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    // Verificar si el nuevo nombre colisiona con otra caja
    if (newName.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await getFn(`SELECT id FROM cajas_registradoras WHERE LOWER(name) = LOWER($1) AND id != $2 LIMIT 1`, [newName, termId]);
      if (dup) {
        const err = new Error(`Ya existe otra caja registradora con el nombre "${newName}".`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Si se intenta desactivar, verificar que no tenga turno abierto actualmente
    if (existing.is_active && !newActive) {
      const openShift = await getFn(`SELECT id FROM caja_turnos WHERE LOWER(terminal) = LOWER($1) AND status = 'open' LIMIT 1`, [existing.name]);
      if (openShift) {
        const err = new Error(`No se puede desactivar la caja "${existing.name}" porque tiene el turno #${openShift.id} actualmente abierto. Debes realizar el Cierre Z antes de desactivarla.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Si cambió el nombre, sincronizar los turnos históricos para mantener la consistencia
    if (newName.toLowerCase() !== existing.name.toLowerCase()) {
      await runFn(`UPDATE caja_turnos SET terminal = $1 WHERE LOWER(terminal) = LOWER($2)`, [newName, existing.name]);
    }

    return await getFn(`
      UPDATE cajas_registradoras
      SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt";
    `, [newName, newDesc, newActive, termId]);
  }

  /**
   * Alternar estado activo/inactivo de una caja registradora
   * @param {number} id - Identificador de la caja
   * @param {Object} [dbClient] - Cliente opcional
   */
  static async toggleTerminalStatus(id, dbClient) {
    const termId = parseInt(id, 10);
    if (isNaN(termId) || termId <= 0) {
      const err = new Error('Identificador de caja registradora inválido.');
      err.statusCode = 400;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const existing = await getFn(`SELECT id, name, description, is_active FROM cajas_registradoras WHERE id = $1`, [termId]);
    if (!existing) {
      const err = new Error(`No se encontró la caja registradora con ID ${termId}.`);
      err.statusCode = 404;
      throw err;
    }

    const willBeActive = !existing.is_active;

    // Si se va a desactivar, validar que no tenga turnos abiertos actualmente
    if (!willBeActive) {
      const openShift = await getFn(`SELECT id FROM caja_turnos WHERE LOWER(terminal) = LOWER($1) AND status = 'open' LIMIT 1`, [existing.name]);
      if (openShift) {
        const err = new Error(`No se puede desactivar la caja "${existing.name}" porque tiene el turno #${openShift.id} abierto. Debes realizar el Cierre Z antes de desactivarla.`);
        err.statusCode = 400;
        throw err;
      }
    }

    return await getFn(`
      UPDATE cajas_registradoras
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt";
    `, [willBeActive, termId]);
  }

  /**
   * Eliminar una caja registradora de forma segura (solo si no tiene historial contable)
   * @param {number} id - Identificador de la caja
   * @param {Object} [dbClient] - Cliente opcional
   */
  static async deleteTerminal(id, dbClient) {
    const termId = parseInt(id, 10);
    if (isNaN(termId) || termId <= 0) {
      const err = new Error('Identificador de caja registradora inválido.');
      err.statusCode = 400;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    const existing = await getFn(`SELECT id, name FROM cajas_registradoras WHERE id = $1`, [termId]);
    if (!existing) {
      const err = new Error(`No se encontró la caja registradora con ID ${termId}.`);
      err.statusCode = 404;
      throw err;
    }

    // Verificar si registra turnos en el historial contable
    const shiftCheck = await getFn(`SELECT COUNT(*) AS count FROM caja_turnos WHERE LOWER(terminal) = LOWER($1)`, [existing.name]);
    const shiftCount = shiftCheck ? parseInt(shiftCheck.count, 10) : 0;

    if (shiftCount > 0) {
      const err = new Error(`No se puede eliminar la caja "${existing.name}" porque registra ${shiftCount} turno(s) contable(s) histórico(s). Por integridad fiscal y auditoría contable, desactívala en su lugar.`);
      err.statusCode = 400;
      throw err;
    }

    await runFn(`DELETE FROM cajas_registradoras WHERE id = $1`, [termId]);
    return { id: existing.id, name: existing.name, deleted: true };
  }
}

module.exports = CashModel;
