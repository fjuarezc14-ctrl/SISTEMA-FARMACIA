const { get, query, transaction } = require('../db');

/**
 * Obtener turno activo de caja y sus movimientos
 */
async function getCurrentShift(req, res, next) {
  try {
    const shift = await get(`
      SELECT 
        c.id,
        c.terminal,
        CAST(c.opening_balance AS FLOAT) AS "openingBalance",
        CAST(c.cash_sales AS FLOAT) AS "cashSales",
        CAST(c.digital_sales AS FLOAT) AS "digitalSales",
        CAST(c.expenses AS FLOAT) AS "expenses",
        CAST(c.expected_balance AS FLOAT) AS "expectedBalance",
        CAST(c.counted_balance AS FLOAT) AS "countedBalance",
        CAST(c.difference AS FLOAT) AS "difference",
        c.status,
        c.opened_at AS "openedAt",
        u.name AS "cashierName"
      FROM caja_turnos c
      JOIN usuarios u ON c.user_id = u.id
      WHERE c.status = 'open'
      ORDER BY c.id DESC
      LIMIT 1;
    `);

    if (!shift) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No hay turno de caja abierto actualmente.'
      });
    }

    const movements = await query(`
      SELECT 
        id,
        type,
        CAST(amount AS FLOAT) AS amount,
        concept,
        responsible,
        TO_CHAR(created_at, 'HH24:MI:SS') AS time
      FROM caja_movimientos
      WHERE turno_id = $1
      ORDER BY id DESC;
    `, [shift.id]);

    res.status(200).json({
      success: true,
      source: 'PostgreSQL 16',
      data: {
        shift,
        movements
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar egreso o ingreso en caja chica
 */
async function addMovement(req, res, next) {
  try {
    const { amount, concept, responsible, type = 'egreso' } = req.body;

    if (!amount || amount <= 0 || !concept) {
      return res.status(400).json({
        success: false,
        message: 'Monto y concepto son requeridos.'
      });
    }

    const result = await transaction(async ({ run, get }) => {
      const shift = await get("SELECT * FROM caja_turnos WHERE status = 'open' ORDER BY id DESC LIMIT 1");
      if (!shift) {
        throw new Error('No hay turno de caja abierto para registrar movimientos.');
      }

      await run(
        `INSERT INTO caja_movimientos (turno_id, type, amount, concept, responsible)
         VALUES ($1, $2, $3, $4, $5)`,
        [shift.id, type, amount, concept, responsible || 'Cajero de Turno']
      );

      // Actualizar totales en el turno
      if (type === 'egreso') {
        await run(
          `UPDATE caja_turnos 
           SET expenses = expenses + $1,
               expected_balance = (opening_balance + cash_sales) - (expenses + $1)
           WHERE id = $2`,
          [amount, shift.id]
        );
      } else {
        await run(
          `UPDATE caja_turnos 
           SET cash_sales = cash_sales + $1,
               expected_balance = (opening_balance + cash_sales + $1) - expenses
           WHERE id = $2`,
          [amount, shift.id]
        );
      }

      return {
        shiftId: shift.id,
        amount,
        concept
      };
    });

    res.status(201).json({
      success: true,
      message: `Movimiento de ${type} registrado en caja en PostgreSQL.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentShift,
  addMovement
};
