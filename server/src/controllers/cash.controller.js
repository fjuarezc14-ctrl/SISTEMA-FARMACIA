const { transaction, query, get } = require('../db');

/**
 * Obtener el turno de caja actualmente abierto con sus movimientos y saldo calculado
 */
async function getCurrentShift(req, res, next) {
  try {
    const activeUserId = (req.user && req.user.id) ? req.user.id : null;
    const requestedShiftId = req.query.shiftId ? parseInt(req.query.shiftId, 10) : null;

    let shift = null;
    if (requestedShiftId && !isNaN(requestedShiftId)) {
      shift = await get(
        `SELECT t.*, u.name as cashier_name, u.email as cashier_email 
         FROM caja_turnos t 
         LEFT JOIN usuarios u ON t.user_id = u.id 
         WHERE t.id = $1 AND t.status = 'open'`,
        [requestedShiftId]
      );
    } else if (activeUserId) {
      shift = await get(
        `SELECT t.*, u.name as cashier_name, u.email as cashier_email 
         FROM caja_turnos t 
         LEFT JOIN usuarios u ON t.user_id = u.id 
         WHERE t.user_id = $1 AND t.status = 'open' 
         ORDER BY t.id DESC 
         LIMIT 1`,
        [activeUserId]
      );
    }

    if (!shift) {
      shift = await get(
        `SELECT t.*, u.name as cashier_name, u.email as cashier_email 
         FROM caja_turnos t 
         LEFT JOIN usuarios u ON t.user_id = u.id 
         WHERE t.status = 'open' 
         ORDER BY t.id DESC 
         LIMIT 1`
      );
    }

    if (!shift) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'No hay ningún turno de caja abierto actualmente.',
        data: { shift: null, movements: [], salesSummary: null }
      });
    }

    // Obtener movimientos de caja chica del turno
    const movements = await query(
      `SELECT * FROM caja_movimientos 
       WHERE turno_id = $1 
       ORDER BY id DESC`,
      [shift.id]
    );

    // Resumen de ventas emitidas en este turno
    const salesSummary = await get(
      `SELECT 
         COUNT(*) as total_vouchers,
         COALESCE(SUM(CASE WHEN invoice_type = 'ticket' THEN 1 ELSE 0 END), 0) as tickets_count,
         COALESCE(SUM(CASE WHEN invoice_type = 'boleta' THEN 1 ELSE 0 END), 0) as boletas_count,
         COALESCE(SUM(CASE WHEN invoice_type = 'factura' THEN 1 ELSE 0 END), 0) as facturas_count,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
         COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) as digital_total,
         COALESCE(SUM(total), 0) as grand_total
       FROM ventas 
       WHERE turno_id = $1 AND status = 'completed'`,
      [shift.id]
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        shift: {
          id: shift.id,
          userId: shift.user_id,
          cashierName: shift.cashier_name || 'Cajero de Turno',
          terminal: shift.terminal,
          openingBalance: parseFloat(shift.opening_balance),
          cashSales: parseFloat(shift.cash_sales),
          digitalSales: parseFloat(shift.digital_sales),
          expenses: parseFloat(shift.expenses),
          expectedBalance: parseFloat(shift.expected_balance),
          status: shift.status,
          openedAt: shift.opened_at
        },
        movements: movements.map(m => ({
          id: m.id,
          type: m.type,
          amount: parseFloat(m.amount),
          concept: m.concept,
          responsible: m.responsible,
          createdAt: m.created_at
        })),
        salesSummary: {
          totalVouchers: parseInt(salesSummary.total_vouchers, 10),
          ticketsCount: parseInt(salesSummary.tickets_count, 10),
          boletasCount: parseInt(salesSummary.boletas_count, 10),
          facturasCount: parseInt(salesSummary.facturas_count, 10),
          cashTotal: parseFloat(salesSummary.cash_total),
          digitalTotal: parseFloat(salesSummary.digital_total),
          grandTotal: parseFloat(salesSummary.grand_total)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar un movimiento de caja chica (egreso o ingreso menor)
 */
async function addMovement(req, res, next) {
  try {
    const { amount, concept, responsible, type = 'egreso', shiftId } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El monto del movimiento debe ser un número positivo mayor a 0.'
      });
    }

    if (!concept || concept.trim().length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Debes indicar el concepto o justificación del gasto.'
      });
    }

    if (!['egreso', 'ingreso'].includes(type)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El tipo de movimiento debe ser "egreso" o "ingreso".'
      });
    }

    const defaultResponsible = (req.user && req.user.name) ? req.user.name : (responsible || 'Cajero de Turno');

    const result = await transaction(async ({ run, get }) => {
      // 1. Obtener turno abierto (priorizar turno del cajero o shiftId solicitado)
      const activeUserId = (req.user && req.user.id) ? req.user.id : null;
      const targetShiftId = shiftId ? parseInt(shiftId, 10) : null;

      let shift = null;
      if (targetShiftId && !isNaN(targetShiftId)) {
        shift = await get("SELECT * FROM caja_turnos WHERE id = $1 AND status = 'open'", [targetShiftId]);
      } else if (activeUserId) {
        shift = await get("SELECT * FROM caja_turnos WHERE user_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1", [activeUserId]);
      }

      if (!shift) {
        shift = await get("SELECT * FROM caja_turnos WHERE status = 'open' ORDER BY id DESC LIMIT 1");
      }

      if (!shift) {
        const err = new Error('No hay ningún turno de caja abierto para registrar movimientos.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Insertar movimiento
      const insertRes = await get(
        `INSERT INTO caja_movimientos (turno_id, type, amount, concept, responsible) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, created_at`,
        [shift.id, type, numAmount, concept.trim(), defaultResponsible]
      );

      // 3. Recalcular balance del turno protegiendo estrictamente opening_balance (fondo fijo inmutable)
      const opening = parseFloat(shift.opening_balance); // INMUTABLE tras la apertura del turno
      const cashSales = parseFloat(shift.cash_sales || 0);

      const moveStats = await get(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) AS total_expenses,
           COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) AS total_income
         FROM caja_movimientos 
         WHERE turno_id = $1`,
        [shift.id]
      );

      const totalExpenses = parseFloat(moveStats.total_expenses);
      const totalIncome = parseFloat(moveStats.total_income);
      const newExpected = Math.round(((opening + cashSales + totalIncome) - totalExpenses) * 100) / 100;

      // Actualizar estrictamente expenses y expected_balance SIN tocar jamás opening_balance
      await run(
        `UPDATE caja_turnos 
         SET expenses = $1, expected_balance = $2 
         WHERE id = $3`,
        [totalExpenses, newExpected, shift.id]
      );

      return {
        movementId: insertRes.id,
        turnoId: shift.id,
        type,
        amount: numAmount,
        concept: concept.trim(),
        responsible: defaultResponsible,
        newExpectedBalance: newExpected,
        createdAt: insertRes.created_at
      };
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Movimiento de ${result.type} por S/ ${result.amount.toFixed(2)} registrado con éxito.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Ejecutar Cierre Z de Caja (Auditoría de Gaveta & Arqueo Oficial)
 */
async function closeZ(req, res, next) {
  try {
    const { countedBalance, denominations = {}, shiftId } = req.body;

    const counted = parseFloat(countedBalance);
    if (isNaN(counted) || counted < 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Debes proporcionar el monto físico contado en gaveta (número igual o mayor a 0).'
      });
    }

    const report = await transaction(async ({ run, get, query }) => {
      // 1. Obtener turno abierto para el usuario autenticado o ID específico
      const activeUserId = (req.user && req.user.id) ? req.user.id : null;
      const targetShiftId = shiftId ? parseInt(shiftId, 10) : null;

      let shift = null;
      if (targetShiftId && !isNaN(targetShiftId)) {
        if (activeUserId && req.user.roleKey !== 'admin') {
          // Cajero cerrando turno específico: debe pertenecer a su usuario
          shift = await get(
            `SELECT t.*, u.name as cashier_name 
             FROM caja_turnos t 
             LEFT JOIN usuarios u ON t.user_id = u.id 
             WHERE t.id = $1 AND t.user_id = $2 AND t.status = 'open'`,
            [targetShiftId, activeUserId]
          );
        } else {
          // Admin o sin restricción
          shift = await get(
            `SELECT t.*, u.name as cashier_name 
             FROM caja_turnos t 
             LEFT JOIN usuarios u ON t.user_id = u.id 
             WHERE t.id = $1 AND t.status = 'open'`,
            [targetShiftId]
          );
        }
      } else if (activeUserId) {
        // Filtrar por el user_id de la sesión activa
        shift = await get(
          `SELECT t.*, u.name as cashier_name 
           FROM caja_turnos t 
           LEFT JOIN usuarios u ON t.user_id = u.id 
           WHERE t.user_id = $1 AND t.status = 'open' 
           ORDER BY t.id DESC 
           LIMIT 1`,
          [activeUserId]
        );
      }

      // Fallback si no se encontró turno específico para el cajero
      if (!shift) {
        shift = await get(
          `SELECT t.*, u.name as cashier_name 
           FROM caja_turnos t 
           LEFT JOIN usuarios u ON t.user_id = u.id 
           WHERE t.status = 'open' 
           ORDER BY t.id DESC 
           LIMIT 1`
        );
      }

      if (!shift) {
        const err = new Error('No hay ningún turno de caja abierto para realizar el Cierre Z.');
        err.statusCode = 400;
        throw err;
      }

      const expected = parseFloat(shift.expected_balance);
      const difference = Math.round((counted - expected) * 100) / 100;

      let auditStatus = 'exacto';
      if (difference > 0) auditStatus = 'sobrante';
      else if (difference < 0) auditStatus = 'faltante';

      // 2. Sellar el turno en PostgreSQL
      await run(
        `UPDATE caja_turnos 
         SET counted_balance = $1, difference = $2, status = 'closed_z', closed_at = NOW() 
         WHERE id = $3`,
        [counted, difference, shift.id]
      );

      // 3. Obtener resumen definitivo de ventas del turno
      const salesStats = await get(
        `SELECT 
           COUNT(*) as total_vouchers,
           COALESCE(SUM(CASE WHEN invoice_type = 'ticket' THEN 1 ELSE 0 END), 0) as tickets_count,
           COALESCE(SUM(CASE WHEN invoice_type = 'boleta' THEN 1 ELSE 0 END), 0) as boletas_count,
           COALESCE(SUM(CASE WHEN invoice_type = 'factura' THEN 1 ELSE 0 END), 0) as facturas_count,
           COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
           COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) as digital_total,
           COALESCE(SUM(subtotal), 0) as taxable_base,
           COALESCE(SUM(igv), 0) as total_igv,
           COALESCE(SUM(total), 0) as grand_total
         FROM ventas 
         WHERE turno_id = $1 AND status = 'completed'`,
        [shift.id]
      );

      // 4. Lista de egresos
      const movements = await query(
        `SELECT * FROM caja_movimientos WHERE turno_id = $1 ORDER BY id ASC`,
        [shift.id]
      );

      return {
        turnoId: shift.id,
        terminal: shift.terminal,
        cashierName: shift.cashier_name || 'Cajero de Turno',
        openedAt: shift.opened_at,
        closedAt: new Date().toISOString(),
        openingBalance: parseFloat(shift.opening_balance),
        cashSales: parseFloat(salesStats.cash_total),
        digitalSales: parseFloat(salesStats.digital_total),
        expenses: parseFloat(shift.expenses),
        expectedBalance: expected,
        countedBalance: counted,
        difference,
        auditStatus,
        vouchers: {
          total: parseInt(salesStats.total_vouchers, 10),
          tickets: parseInt(salesStats.tickets_count, 10),
          boletas: parseInt(salesStats.boletas_count, 10),
          facturas: parseInt(salesStats.facturas_count, 10),
          taxableBase: parseFloat(salesStats.taxable_base),
          totalIgv: parseFloat(salesStats.total_igv),
          grandTotal: parseFloat(salesStats.grand_total)
        },
        movements: movements.map(m => ({
          amount: parseFloat(m.amount),
          concept: m.concept,
          responsible: m.responsible,
          type: m.type
        })),
        denominations
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Cierre Z completado exitosamente. Estado de cuadre: ${report.auditStatus.toUpperCase()}.`,
      data: report
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Apertura de un nuevo turno de caja
 */
async function openShift(req, res, next) {
  try {
    const { openingBalance = 350.00, terminal = 'Caja 01' } = req.body;

    const opening = parseFloat(openingBalance);
    if (isNaN(opening) || opening < 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'El saldo inicial de apertura debe ser un monto válido mayor o igual a 0.'
      });
    }

    // Identificar cajero
    let userId = req.user ? req.user.id : null;
    if (!userId) {
      const defaultUser = await get("SELECT id FROM usuarios WHERE email = 'caja@valetec.pe' LIMIT 1");
      userId = defaultUser ? defaultUser.id : 1;
    }

    // Verificar que este cajero o terminal no tenga ya un turno abierto
    const existing = await get(
      "SELECT id, terminal, user_id FROM caja_turnos WHERE status = 'open' AND (user_id = $1 OR terminal = $2) LIMIT 1",
      [userId, terminal]
    );
    if (existing) {
      const reason = existing.user_id === userId
        ? `Ya tienes un turno de caja abierto (ID: ${existing.id}).`
        : `La terminal "${terminal}" ya tiene un turno abierto (ID: ${existing.id}).`;
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `${reason} Debes realizar el Cierre Z antes de abrir otro turno.`
      });
    }

    const newShift = await get(
      `INSERT INTO caja_turnos 
       (user_id, terminal, opening_balance, cash_sales, digital_sales, expenses, expected_balance, status, opened_at) 
       VALUES ($1, $2, $3, 0.00, 0.00, 0.00, $3, 'open', NOW()) 
       RETURNING *`,
      [userId, terminal, opening]
    );

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Turno de caja abierto exitosamente con fondo inicial de S/ ${opening.toFixed(2)}.`,
      data: {
        id: newShift.id,
        terminal: newShift.terminal,
        openingBalance: parseFloat(newShift.opening_balance),
        expectedBalance: parseFloat(newShift.expected_balance),
        status: newShift.status,
        openedAt: newShift.opened_at
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentShift,
  addMovement,
  closeZ,
  openShift
};
