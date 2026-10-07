const { transaction } = require('../db');
const CashModel = require('../models/cash.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: CASH (CONTROL DE CAJA, ARQUEO Y CIERRE Z)
 * ============================================================================
 * Orquesta la apertura de turnos, movimientos de caja chica y el Cierre Z oficial.
 * Las validaciones de saldos y la persistencia de turnos residen en CashModel.
 */

/**
 * GET /api/cash/current
 * Obtener el turno de caja actualmente abierto con sus movimientos y balance
 */
async function getCurrentShift(req, res, next) {
  try {
    const activeUserId = (req.user && req.user.id) ? req.user.id : null;
    const isAdmin = (req.user && (req.user.roleKey === 'admin' || req.user.role === 'admin'));
    const requestedShiftId = req.query.shiftId ? parseInt(req.query.shiftId, 10) : null;

    const shift = await CashModel.getOpenShift({
      shiftId: requestedShiftId,
      userId: activeUserId,
      isAdmin
    });

    if (!shift) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'No hay ningún turno de caja abierto actualmente.',
        data: { shift: null, movements: [], salesSummary: null }
      });
    }

    // Obtener movimientos y consolidado de ventas del turno
    const movements = await CashModel.getMovements(shift.id);
    const salesSummary = await CashModel.getSalesSummary(shift.id);

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
          createdAt: m.createdAt
        })),
        salesSummary: {
          totalVouchers: salesSummary.total_vouchers,
          ticketsCount: salesSummary.tickets_count,
          boletasCount: salesSummary.boletas_count,
          facturasCount: salesSummary.facturas_count,
          cashTotal: salesSummary.cash_total,
          digitalTotal: salesSummary.digital_total,
          grandTotal: salesSummary.grand_total
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cash/movements
 * Registrar un movimiento de caja chica (egreso o ingreso menor)
 */
async function addMovement(req, res, next) {
  try {
    const { amount, concept, responsible, type = 'egreso', shiftId } = req.body;

    const activeUserId = (req.user && req.user.id) ? req.user.id : null;
    const defaultResponsible = (req.user && req.user.name) ? req.user.name : (responsible || 'Cajero de Turno');

    const result = await transaction(async (tx) => {
      // 1. Obtener turno abierto asignado al cajero o al shiftId
      const shift = await CashModel.getOpenShift({
        shiftId: shiftId ? parseInt(shiftId, 10) : null,
        userId: activeUserId
      }, tx);

      if (!shift) {
        const err = new Error('No hay ningún turno de caja abierto para registrar movimientos.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Registrar movimiento mediante el modelo
      const movement = await CashModel.addMovement({
        turnoId: shift.id,
        type,
        amount,
        concept,
        responsible: defaultResponsible
      }, tx);

      // Obtener el nuevo balance esperado
      const updatedShift = await CashModel.getShiftById(shift.id, tx);

      return {
        movementId: movement.id,
        turnoId: shift.id,
        type: movement.type,
        amount: parseFloat(movement.amount),
        concept: movement.concept,
        responsible: movement.responsible,
        newExpectedBalance: parseFloat(updatedShift.expected_balance),
        createdAt: movement.created_at
      };
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Movimiento de ${result.type} por S/ ${result.amount.toFixed(2)} registrado con éxito.`,
      data: result
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
 * POST /api/cash/close
 * Ejecutar Cierre Z de Caja (Auditoría de Gaveta & Arqueo Oficial)
 */
async function closeZ(req, res, next) {
  try {
    const { countedBalance, denominations = {}, shiftId } = req.body;
    const activeUserId = (req.user && req.user.id) ? req.user.id : null;

    CashModel.validateCloseZ({ countedBalance });

    const report = await transaction(async (tx) => {
      // 1. Localizar turno abierto (permite a Administrador supervisar/cerrar el turno activo)
      const isAdmin = (req.user && req.user.roleKey === 'admin');
      const shift = await CashModel.getOpenShift({
        shiftId: shiftId ? parseInt(shiftId, 10) : null,
        userId: isAdmin ? null : activeUserId,
        isAdmin,
        adminUserId: isAdmin ? activeUserId : null
      }, tx);

      if (!shift) {
        const err = new Error('No hay ningún turno de caja abierto para realizar el Cierre Z.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Sellar turno con Arqueo Z en el modelo
      const closed = await CashModel.closeZ({
        shiftId: shift.id,
        countedBalance
      }, tx);

      // 3. Obtener consolidado contable del turno
      const salesStats = await CashModel.getSalesSummary(shift.id, tx);
      const movements = await CashModel.getMovements(shift.id, tx);

      const difference = parseFloat(closed.difference);
      let auditStatus = 'exacto';
      if (difference > 0) auditStatus = 'sobrante';
      else if (difference < 0) auditStatus = 'faltante';

      return {
        turnoId: shift.id,
        terminal: shift.terminal,
        cashierName: shift.cashier_name || 'Cajero de Turno',
        openedAt: shift.opened_at,
        closedAt: closed.closed_at,
        openingBalance: parseFloat(shift.opening_balance),
        cashSales: parseFloat(salesStats.cash_total),
        digitalSales: parseFloat(salesStats.digital_total),
        expenses: parseFloat(closed.expenses || shift.expenses),
        expectedBalance: parseFloat(closed.expected_balance),
        countedBalance: parseFloat(closed.counted_balance),
        difference,
        auditStatus,
        denominations,
        vouchers: {
          tickets: salesStats.tickets_count,
          boletas: salesStats.boletas_count,
          facturas: salesStats.facturas_count,
          total: salesStats.total_vouchers
        },
        movements: movements.map(m => ({
          id: m.id,
          type: m.type,
          amount: parseFloat(m.amount),
          concept: m.concept,
          responsible: m.responsible
        }))
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Cierre Z completado exitosamente para ${report.terminal}.`,
      data: report
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
 * POST /api/cash/open
 * Apertura de nuevo turno de caja con sencillo inicial
 */
async function openShift(req, res, next) {
  try {
    const { openingBalance = 350.00, terminal = 'Caja 01' } = req.body;
    const userId = (req.user && req.user.id) ? req.user.id : 1;

    const newShift = await CashModel.openShift({
      userId,
      terminal,
      openingBalance
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Turno de caja abierto exitosamente en "${newShift.terminal}" con S/ ${parseFloat(newShift.opening_balance).toFixed(2)}.`,
      data: {
        id: newShift.id,
        userId: newShift.user_id,
        terminal: newShift.terminal,
        openingBalance: parseFloat(newShift.opening_balance),
        expectedBalance: parseFloat(newShift.expected_balance),
        status: newShift.status,
        openedAt: newShift.opened_at
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
 * GET /api/cash/history
 * Obtener historial de Cierres Z oficiales y turnos sellados
 */
async function getShiftHistory(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await CashModel.getShiftsHistory(limit);

    res.status(200).json({
      success: true,
      statusCode: 200,
      count: history.length,
      data: history
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cash/terminals
 * Obtener listado de cajas registradoras configuradas
 */
async function getTerminals(req, res, next) {
  try {
    const onlyActive = req.query.all !== 'true';
    const terminals = await CashModel.getTerminals(onlyActive);
    res.status(200).json({
      success: true,
      statusCode: 200,
      count: terminals.length,
      data: terminals
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cash/terminals
 * Registrar una nueva caja registradora / terminal POS (Solo Administrador)
 */
async function createTerminal(req, res, next) {
  try {
    const { name, description } = req.body;
    const terminal = await CashModel.createTerminal({ name, description });
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Caja registradora "${terminal.name}" creada exitosamente.`,
      data: terminal
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
 * PUT /api/cash/terminals/:id
 * Actualizar datos de una caja registradora (Solo Administrador)
 */
async function updateTerminal(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    const terminal = await CashModel.updateTerminal(id, { name, description, isActive });
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Caja registradora "${terminal.name}" actualizada con éxito.`,
      data: terminal
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
 * PATCH /api/cash/terminals/:id/status
 * Activar o desactivar una caja registradora (Solo Administrador)
 */
async function toggleTerminalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const terminal = await CashModel.toggleTerminalStatus(id);
    const estadoStr = terminal.isActive ? 'activada' : 'desactivada';
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Caja registradora "${terminal.name}" ${estadoStr} correctamente.`,
      data: terminal
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
 * DELETE /api/cash/terminals/:id
 * Eliminar permanentemente una caja sin turnos históricos (Solo Administrador)
 */
async function deleteTerminal(req, res, next) {
  try {
    const { id } = req.params;
    const result = await CashModel.deleteTerminal(id);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Caja registradora "${result.name}" eliminada exitosamente.`,
      data: result
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

module.exports = {
  getCurrentShift,
  addMovement,
  closeZ,
  openShift,
  getShiftHistory,
  getTerminals,
  createTerminal,
  updateTerminal,
  toggleTerminalStatus,
  deleteTerminal
};
