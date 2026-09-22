const { query, get } = require('../db');

/**
 * GET /api/dashboard/kpis
 * Resumen consolidado de ventas del día, mes, márgenes e inventario
 */
async function getKpis(req, res, next) {
  try {
    // 1. Resumen de ventas (hoy vs acumulado)
    const salesSummary = await get(`
      SELECT 
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN total ELSE 0 END), 0) AS today_sales,
        COALESCE(COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END), 0) AS today_vouchers,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND created_at >= CURRENT_DATE THEN total ELSE 0 END), 0) AS today_cash_sales,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' AND created_at >= CURRENT_DATE THEN total ELSE 0 END), 0) AS today_digital_sales,
        COALESCE(SUM(total), 0) AS month_sales,
        COALESCE(COUNT(*), 0) AS month_vouchers,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) AS month_cash_sales,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) AS month_digital_sales,
        COALESCE(SUM(subtotal), 0) AS month_taxable_base,
        COALESCE(SUM(igv), 0) AS month_igv,
        COALESCE(AVG(total), 0) AS avg_ticket
      FROM ventas 
      WHERE status = 'completed';
    `);

    const totalRevenue = parseFloat(salesSummary.month_sales);
    const estimatedGrossProfit = Math.round((totalRevenue * 0.35) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? 35.0 : 0;

    // 2. Resumen sanitario de lotes FEFO
    const lotStats = await get(`
      SELECT 
        COUNT(*) AS total_lots,
        COALESCE(SUM(CASE WHEN expire_date <= CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS warning_lots,
        COALESCE(SUM(CASE WHEN expire_date < CURRENT_DATE OR stock_units = 0 THEN 1 ELSE 0 END), 0) AS expired_or_empty_lots,
        COALESCE(SUM(CASE WHEN expire_date > CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS healthy_lots
      FROM lotes_fefo;
    `);

    // 3. Estado de caja chica y turno
    const activeShift = await get(`
      SELECT t.id, t.terminal, u.name AS cashier_name, t.opening_balance, t.cash_sales, t.digital_sales, t.expenses, t.expected_balance, t.status 
      FROM caja_turnos t
      LEFT JOIN usuarios u ON t.user_id = u.id
      WHERE t.status = 'open' 
      ORDER BY t.id DESC 
      LIMIT 1;
    `);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        financials: {
          todaySales: parseFloat(salesSummary.today_sales),
          todayVouchers: parseInt(salesSummary.today_vouchers, 10),
          todayCashSales: parseFloat(salesSummary.today_cash_sales),
          todayDigitalSales: parseFloat(salesSummary.today_digital_sales),
          monthSales: parseFloat(salesSummary.month_sales),
          monthVouchers: parseInt(salesSummary.month_vouchers, 10),
          monthCashSales: parseFloat(salesSummary.month_cash_sales),
          monthDigitalSales: parseFloat(salesSummary.month_digital_sales),
          taxableBase: parseFloat(salesSummary.month_taxable_base),
          igvCollected: parseFloat(salesSummary.month_igv),
          averageTicket: Math.round(parseFloat(salesSummary.avg_ticket) * 100) / 100,
          estimatedProfit: estimatedGrossProfit,
          profitMarginPercent
        },
        inventoryFefo: {
          totalLots: parseInt(lotStats.total_lots, 10),
          healthyLots: parseInt(lotStats.healthy_lots, 10),
          warningLots: parseInt(lotStats.warning_lots, 10),
          expiredOrEmpty: parseInt(lotStats.expired_or_empty_lots, 10)
        },
        cashShift: activeShift ? {
          id: activeShift.id,
          terminal: activeShift.terminal,
          cashierName: activeShift.cashier_name || 'Cajero de Turno',
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

/**
 * GET /api/dashboard/sales-chart
 * Cronología de ventas diarias y desglose por hora de hoy
 */
async function getSalesChart(req, res, next) {
  try {
    // 1. Histórico de ventas de los últimos 14 días
    const dailyStats = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        TO_CHAR(created_at, 'Dy') AS day_name,
        COUNT(*) AS vouchers,
        COALESCE(SUM(total), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) AS digital_sales
      FROM ventas 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD'), TO_CHAR(created_at, 'Dy')
      ORDER BY date ASC;
    `);

    // 2. Ventas agrupadas por hora de hoy
    const hourlyToday = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at)::integer AS hour,
        COUNT(*) AS vouchers,
        COALESCE(SUM(total), 0) AS total_sales
      FROM ventas
      WHERE status = 'completed' AND created_at >= CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC;
    `);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        period: 'last_14_days',
        daily: dailyStats.map(d => ({
          date: d.date,
          dayName: d.day_name,
          vouchers: parseInt(d.vouchers, 10),
          totalSales: parseFloat(d.total_sales),
          cashSales: parseFloat(d.cash_sales),
          digitalSales: parseFloat(d.digital_sales)
        })),
        hourlyToday: hourlyToday.map(h => ({
          hour: parseInt(h.hour, 10),
          label: `${String(h.hour).padStart(2, '0')}:00`,
          vouchers: parseInt(h.vouchers, 10),
          totalSales: parseFloat(h.total_sales)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/top-products
 * Ranking de medicamentos más vendidos agrupados por rotación y facturación
 */
async function getTopProducts(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const topProducts = await query(`
      SELECT 
        p.id,
        p.name,
        p.generic_dci AS generic_dci,
        p.category_id,
        c.name AS category_name,
        SUM(d.quantity)::int AS units_sold,
        SUM(d.subtotal)::float AS revenue,
        COUNT(DISTINCT d.sale_id)::int AS orders
      FROM ventas_detalles d
      JOIN productos p ON d.product_id = p.id
      LEFT JOIN categorias c ON p.category_id = c.id
      JOIN ventas v ON d.sale_id = v.id
      WHERE v.status = 'completed'
      GROUP BY p.id, p.name, p.generic_dci, p.category_id, c.name
      ORDER BY units_sold DESC 
      LIMIT $1;
    `, [limit]);

    res.status(200).json({
      success: true,
      statusCode: 200,
      count: topProducts.length,
      data: topProducts.map(tp => ({
        id: tp.id,
        name: tp.name,
        genericDci: tp.generic_dci,
        category: tp.category_name || 'General',
        unitsSold: tp.units_sold,
        revenue: Math.round(tp.revenue * 100) / 100,
        ordersCount: tp.orders
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getKpis,
  getSalesChart,
  getTopProducts
};
