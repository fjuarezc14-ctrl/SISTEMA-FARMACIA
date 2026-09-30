const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: CATEGORY (CATEGORÍAS FARMACÉUTICAS)
 * ============================================================================
 * Representa las familias terapéuticas y categorías del inventario.
 * Encapsula la gestión de catálogos y la integridad referencial con medicamentos.
 */
class CategoryModel {
  /**
   * Helper utilitario para generar un slug limpio a partir de un texto.
   * Remueve acentos y caracteres especiales.
   */
  static slugify(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validaciones defensivas de integridad para los atributos de una categoría.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Validación de 'name'
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('El nombre de la categoría es obligatorio.');
      } else {
        const cleanName = data.name.trim();
        if (cleanName.length < 2 || cleanName.length > 100) {
          errors.push('El nombre de la categoría debe tener entre 2 y 100 caracteres.');
        }
      }
    }

    // 2. Validación de 'slug' (opcional)
    if (data.slug !== undefined && data.slug !== null && String(data.slug).trim() !== '') {
      const cleanSlug = String(data.slug).trim().toLowerCase();
      if (cleanSlug.length < 2 || cleanSlug.length > 50) {
        errors.push('El slug debe tener entre 2 y 50 caracteres.');
      }
      if (!/^[a-z0-9_-]+$/.test(cleanSlug)) {
        errors.push('El slug solo permite letras minúsculas, números, guiones y guiones bajos.');
      }
    }

    // 3. Validación de 'icon' (opcional)
    if (data.icon !== undefined && data.icon !== null && String(data.icon).trim() !== '') {
      const cleanIcon = String(data.icon).trim();
      if (cleanIcon.length > 50) {
        errors.push('El identificador del icono no puede exceder los 50 caracteres.');
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
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
      const err = new Error('El ID de categoría debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener todas las categorías con el conteo de medicamentos vinculados.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async getAllWithProductCount(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        c.id, 
        c.slug, 
        c.name, 
        COALESCE(c.icon, 'bi-tag') AS icon, 
        c.created_at AS "createdAt", 
        COUNT(p.id)::int AS "productCount"
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.id ASC;
    `);
  }

  /**
   * Buscar una categoría por su ID numérico.
   * @param {number|string} id - ID de la categoría.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = CategoryModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id, 
        slug, 
        name, 
        COALESCE(icon, 'bi-tag') AS icon, 
        created_at AS "createdAt"
      FROM categorias
      WHERE id = $1
      LIMIT 1;
    `, [validId]);
  }

  /**
   * Buscar categoría por slug único.
   * @param {string} slug - Slug de la categoría.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findBySlug(slug, dbClient) {
    if (!slug || typeof slug !== 'string') return null;
    const cleanSlug = slug.trim().toLowerCase();
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id, 
        slug, 
        name, 
        COALESCE(icon, 'bi-tag') AS icon, 
        created_at AS "createdAt"
      FROM categorias
      WHERE slug = $1
      LIMIT 1;
    `, [cleanSlug]);
  }

  /**
   * Buscar categoría por nombre insensible a mayúsculas.
   * @param {string} name - Nombre de la categoría.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findByName(name, dbClient) {
    if (!name || typeof name !== 'string') return null;
    const cleanName = name.trim();
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id, 
        slug, 
        name, 
        COALESCE(icon, 'bi-tag') AS icon, 
        created_at AS "createdAt"
      FROM categorias
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1;
    `, [cleanName]);
  }

  /**
   * Contar medicamentos vinculados a una categoría.
   * @param {number|string} categoryId - ID de la categoría.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<number>}
   */
  static async countProductsByCategoryId(categoryId, dbClient) {
    const validId = CategoryModel.validateId(categoryId);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const row = await getFn(`
      SELECT COUNT(*)::int AS count 
      FROM productos 
      WHERE category_id = $1;
    `, [validId]);

    return row ? parseInt(row.count, 10) : 0;
  }

  /**
   * Crear una nueva categoría con slug autogenerado y validación de unicidad.
   * @param {Object} data - { name, slug, icon }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Categoría creada.
   */
  static async create(data, dbClient) {
    CategoryModel.validate(data, false);

    const cleanName = data.name.trim();
    const cleanSlug = data.slug && data.slug.trim() !== ''
      ? data.slug.trim().toLowerCase()
      : CategoryModel.slugify(cleanName);
    const cleanIcon = data.icon ? data.icon.trim() : 'bi-capsule';

    // 1. Verificar duplicidad de slug o nombre
    const existing = await CategoryModel.findBySlug(cleanSlug, dbClient) || await CategoryModel.findByName(cleanName, dbClient);
    if (existing) {
      const err = new Error(`La categoría "${cleanName}" ya se encuentra registrada.`);
      err.statusCode = 409;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      INSERT INTO categorias (slug, name, icon)
      VALUES ($1, $2, $3)
      RETURNING 
        id, 
        slug, 
        name, 
        icon, 
        created_at AS "createdAt";
    `, [cleanSlug, cleanName, cleanIcon]);
  }

  /**
   * Actualizar una categoría existente.
   * @param {number|string} id - ID de la categoría.
   * @param {Object} data - { name, icon }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Categoría actualizada.
   */
  static async update(id, data, dbClient) {
    const validId = CategoryModel.validateId(id);
    CategoryModel.validate(data, true);

    // 1. Verificar existencia
    const current = await CategoryModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Categoría #${validId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    const cleanName = data.name ? data.name.trim() : current.name;
    const cleanIcon = data.icon !== undefined ? data.icon.trim() : current.icon;

    // 2. Si se cambia el nombre, verificar que no colisione con otra categoría
    if (cleanName.toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await CategoryModel.findByName(cleanName, dbClient);
      if (duplicate && duplicate.id !== validId) {
        const err = new Error(`El nombre de categoría "${cleanName}" ya está en uso.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      UPDATE categorias 
      SET name = $1, icon = $2
      WHERE id = $3
      RETURNING 
        id, 
        slug, 
        name, 
        icon, 
        created_at AS "createdAt";
    `, [cleanName, cleanIcon, validId]);
  }

  /**
   * Eliminar una categoría con validación estricta de productos asignados.
   * @param {number|string} id - ID de la categoría.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Categoría eliminada.
   */
  static async delete(id, dbClient) {
    const validId = CategoryModel.validateId(id);

    // 1. Verificar existencia
    const cat = await CategoryModel.findById(validId, dbClient);
    if (!cat) {
      const err = new Error(`Categoría #${validId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Verificar si tiene medicamentos asignados
    const count = await CategoryModel.countProductsByCategoryId(validId, dbClient);
    if (count > 0) {
      const err = new Error(`No se puede eliminar la categoría porque tiene ${count} medicamento(s) asignado(s). Reasigne los productos antes de eliminar.`);
      err.statusCode = 409;
      throw err;
    }

    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;
    await runFn(`DELETE FROM categorias WHERE id = $1;`, [validId]);

    return cat;
  }

  /**
   * Reasignar productos masivamente de una categoría a otra.
   * @param {number|string} sourceCategoryId - Categoría origen.
   * @param {number|string} targetCategoryId - Categoría destino.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<{ reassignedCount: number }>}
   */
  static async reassignProducts(sourceCategoryId, targetCategoryId, dbClient) {
    const srcId = CategoryModel.validateId(sourceCategoryId);
    const dstId = CategoryModel.validateId(targetCategoryId);

    if (srcId === dstId) {
      const err = new Error('La categoría de origen y la de destino deben ser diferentes.');
      err.statusCode = 400;
      throw err;
    }

    // Verificar que ambas categorías existan
    const srcCat = await CategoryModel.findById(srcId, dbClient);
    const dstCat = await CategoryModel.findById(dstId, dbClient);

    if (!srcCat) throw Object.assign(new Error(`Categoría origen #${srcId} no encontrada.`), { statusCode: 404 });
    if (!dstCat) throw Object.assign(new Error(`Categoría destino #${dstId} no encontrada.`), { statusCode: 404 });

    const count = await CategoryModel.countProductsByCategoryId(srcId, dbClient);
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    await runFn(`
      UPDATE productos 
      SET category_id = $1 
      WHERE category_id = $2;
    `, [dstId, srcId]);

    return { reassignedCount: count };
  }
}

module.exports = CategoryModel;
