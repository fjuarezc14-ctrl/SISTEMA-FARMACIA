const DashboardModel = require('../models/dashboard.model');
const CashModel = require('../models/cash.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: DASHBOARD (MÉTRICAS Y REPORTES EJECUTIVOS)
 * ============================================================================
 * Orquesta KPIs financieros, cronología de ventas y rotación de inventario.
 * Cero SQL en el controlador (Arquitectura MVC Estricta).
 * ============================================================================
 */

/**
 * GET /api/dashboard/kpis
 * Resumen consolidado de ventas del día, mes, márgenes e inventario
 */
async function getKpis(req, res, next) {
  try {
    const salesSummary = await DashboardModel.getSalesSummary();
    const lotStats = await DashboardModel.getLotStats();
    const activeShift = await CashModel.getOpenShift();

    const totalRevenue = parseFloat(salesSummary.month_sales);
    const estimatedGrossProfit = Math.round((totalRevenue * 0.35) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? 35.0 : 0;

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
    const { dailyStats, hourlyToday } = await DashboardModel.getSalesChart(14);

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
    const topProducts = await DashboardModel.getTopSellingProducts(limit);

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
