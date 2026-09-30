/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: DASHBOARD (MÉTRICAS, KPIS Y ROTACIÓN)
 * ============================================================================
 * Encapsula consultas de agregación y análisis financiero, rotación FEFO
 * y cronología de ventas para la Torre de Control gerencial.
 * ============================================================================
 */

const { query, get } = require('../db');

class DashboardModel {
  /**
   * Resumen financiero de ventas del día vs acumulado del mes.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getSalesSummary(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    return await getFn(`
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
  }

  /**
   * Resumen de salud y caducidades de lotes FEFO en almacén.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getLotStats(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    return await getFn(`
      SELECT 
        COUNT(*) AS total_lots,
        COALESCE(SUM(CASE WHEN expire_date <= CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS warning_lots,
        COALESCE(SUM(CASE WHEN expire_date < CURRENT_DATE OR stock_units = 0 THEN 1 ELSE 0 END), 0) AS expired_or_empty_lots,
        COALESCE(SUM(CASE WHEN expire_date > CURRENT_DATE + INTERVAL '90 days' AND stock_units > 0 THEN 1 ELSE 0 END), 0) AS healthy_lots
      FROM lotes_fefo;
    `);
  }

  /**
   * Cronología de ventas diarias de los últimos N días y ventas por hora de hoy.
   * @param {number} [days=14] - Días históricos a consultar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getSalesChart(days = 14, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    const dailyStats = await queryFn(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        TO_CHAR(created_at, 'Dy') AS day_name,
        COUNT(*) AS vouchers,
        COALESCE(SUM(total), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total ELSE 0 END), 0) AS digital_sales
      FROM ventas 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD'), TO_CHAR(created_at, 'Dy')
      ORDER BY date ASC;
    `, [days]);

    const hourlyToday = await queryFn(`
      SELECT 
        EXTRACT(HOUR FROM created_at)::integer AS hour,
        COUNT(*) AS vouchers,
        COALESCE(SUM(total), 0) AS total_sales
      FROM ventas
      WHERE status = 'completed' AND created_at >= CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC;
    `);

    return { dailyStats, hourlyToday };
  }

  /**
   * Ranking de los productos más vendidos por rotación e ingresos.
   * @param {number} [limit=10] - Límite de productos a retornar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   */
  static async getTopProducts(limit = 10, dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    return await queryFn(`
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
  }
}

module.exports = DashboardModel;
