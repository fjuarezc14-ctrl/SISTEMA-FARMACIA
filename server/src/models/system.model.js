/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: SYSTEM (CATÁLOGO DEL SISTEMA Y METADATOS PG)
 * ============================================================================
 * Encapsula consultas de introspección del motor PostgreSQL 16 para
 * auditoría de esquemas, tamaños de base de datos y copias de seguridad.
 * ============================================================================
 */

const { query, get } = require('../db');

class SystemModel {
  /**
   * Obtiene la lista de tablas públicas en el catálogo de PostgreSQL.
   * @param {Object} [dbClient] 
   */
  static async getPublicTables(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    return await queryFn(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename ASC;
    `);
  }

  /**
   * Obtiene el tamaño legible actual de la base de datos PostgreSQL.
   * @param {Object} [dbClient] 
   */
  static async getDatabaseSize(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    return await getFn(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
    `);
  }

  /**
   * Obtiene conteos de entidades principales para auditoría del sistema.
   * @param {Object} [dbClient]
   */
  static async getStatsSummary(dbClient) {
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const [totalProducts, totalLots, totalUsers, totalRoles, totalCategories, totalDigemid] = await Promise.all([
      getFn('SELECT COUNT(*) AS count FROM productos'),
      getFn('SELECT COUNT(*) AS count FROM lotes_fefo'),
      getFn('SELECT COUNT(*) AS count FROM usuarios'),
      getFn('SELECT COUNT(*) AS count FROM roles'),
      getFn('SELECT COUNT(*) AS count FROM categorias'),
      getFn('SELECT COUNT(*) AS count FROM recetas_digemid')
    ]);

    return {
      totalProducts: parseInt(totalProducts.count, 10),
      totalLots: parseInt(totalLots.count, 10),
      totalUsers: parseInt(totalUsers.count, 10),
      totalRoles: parseInt(totalRoles.count, 10),
      totalCategories: parseInt(totalCategories.count, 10),
      totalDigemid: parseInt(totalDigemid.count, 10)
    };
  }
}

module.exports = SystemModel;
