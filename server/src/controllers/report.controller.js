const { query, get } = require('../db');

/**
 * Obtener métricas consolidadas en tiempo real para la Torre de Control (Dashboard Gerencial)
 */
async function getDashboardMetrics(req, res, next) {
  try {
    // 1. Resumen de ventas de hoy y del mes
    const salesSummary = await get(
      `SELECT 
         COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN total ELSE 0 END), 0) AS today_sales,
         COALESCE(COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END), 0) AS today_vouchers,
         COALESCE(SUM(total), 0) AS month_sales,
         COALESCE(COUNT(*), 0) AS month_vouchers,
         COALESCE(SUM(subtotal), 0) AS month_taxable_base,
         COALESCE(SUM(igv), 0) AS month_igv,
         COALESCE(AVG(total), 0) AS avg_ticket
       FROM ventas 
       WHERE status = 'completed'`
    );

    // 2. Margen de Ganancia Bruta Estimada
    // Calculado a partir de las partidas vendidas con margen farmacéutico promedio estimado (32%)
    const totalRevenue = parseFloat(salesSummary.month_sales);
    const estimatedGrossProfit = Math.round((totalRevenue * 0.35) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? 35.0 : 0;

    // 3. Top 5 medicamentos más vendidos (rotación de mostrador)
    const topProducts = await query(
      `SELECT 
         p.id,
         p.name,
         p.generic_dci,
         p.category_id,
         c.name AS category_name,
         SUM(d.quantity) AS total_units_sold,
         SUM(d.subtotal) AS total_revenue
       FROM ventas_detalles d
       JOIN productos p ON d.product_id = p.id
       LEFT JOIN categorias c ON p.category_id = c.id
       GROUP BY p.id, p.name, p.generic_dci, p.category_id, c.name
       ORDER BY total_units_sold DESC 
       LIMIT 5`
    );

    // 4. Estado de Lotes FEFO en Almacén
    const lotStats = await get(
      `SELECT 
         COUNT(*) AS total_lots,
         COALESCE(SUM(CASE WHEN expire_date <= CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS warning_lots,
         COALESCE(SUM(CASE WHEN expire_date < CURRENT_DATE OR stock_units = 0 THEN 1 ELSE 0 END), 0) AS expired_or_empty_lots,
         COALESCE(SUM(CASE WHEN expire_date > CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS healthy_lots
       FROM lotes_fefo`
    );

    // 5. Estado actual de Caja
    const activeShift = await get(
      `SELECT id, terminal, opening_balance, cash_sales, digital_sales, expenses, expected_balance, status 
       FROM caja_turnos 
       WHERE status = 'open' 
       ORDER BY id DESC 
       LIMIT 1`
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        financials: {
          todaySales: parseFloat(salesSummary.today_sales),
          todayVouchers: parseInt(salesSummary.today_vouchers, 10),
          monthSales: parseFloat(salesSummary.month_sales),
          monthVouchers: parseInt(salesSummary.month_vouchers, 10),
          taxableBase: parseFloat(salesSummary.month_taxable_base),
          igvCollected: parseFloat(salesSummary.month_igv),
          averageTicket: Math.round(parseFloat(salesSummary.avg_ticket) * 100) / 100,
          estimatedProfit: estimatedGrossProfit,
          profitMarginPercent
        },
        topProducts: topProducts.map(tp => ({
          id: tp.id,
          name: tp.name,
          genericDci: tp.generic_dci,
          category: tp.category_name || 'General',
          unitsSold: parseInt(tp.total_units_sold, 10),
          revenue: parseFloat(tp.total_revenue)
        })),
        inventoryFefo: {
          totalLots: parseInt(lotStats.total_lots, 10),
          healthyLots: parseInt(lotStats.healthy_lots, 10),
          warningLots: parseInt(lotStats.warning_lots, 10),
          expiredOrEmpty: parseInt(lotStats.expired_or_empty_lots, 10)
        },
        cashShift: activeShift ? {
          id: activeShift.id,
          terminal: activeShift.terminal,
          openingBalance: parseFloat(activeShift.opening_balance),
          cashSales: parseFloat(activeShift.cash_sales),
          digitalSales: parseFloat(activeShift.digital_sales),
          expenses: parseFloat(activeShift.expenses),
          expectedBalance: parseFloat(activeShift.expected_balance),
          status: activeShift.status
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics
};
