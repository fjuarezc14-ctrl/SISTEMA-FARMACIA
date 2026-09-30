const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: LABORATORY (LABORATORIOS Y FABRICANTES)
 * ============================================================================
 * Representa los laboratorios farmacéuticos y marcas fabricantes de medicamentos.
 * Encapsula la gestión de catálogos de proveedores y la integridad referencial.
 */
class LaboratoryModel {
  /**
   * Validaciones defensivas de integridad para los atributos de un laboratorio.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Validación de 'name'
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('El nombre del laboratorio es obligatorio.');
      } else {
        const cleanName = data.name.trim();
        if (cleanName.length < 2 || cleanName.length > 150) {
          errors.push('El nombre del laboratorio debe tener entre 2 y 150 caracteres.');
        }
      }
    }

    // 2. Validación de 'country' (opcional)
    if (data.country !== undefined && data.country !== null) {
      if (typeof data.country !== 'string') {
        errors.push('El país de origen debe ser una cadena de texto.');
      } else if (data.country.trim().length > 100) {
        errors.push('El país de origen no puede exceder los 100 caracteres.');
      }
    }

    // 3. Validación de 'contact' (opcional)
    if (data.contact !== undefined && data.contact !== null) {
      if (typeof data.contact !== 'string') {
        errors.push('La información de contacto debe ser una cadena de texto.');
      } else if (data.contact.trim().length > 255) {
        errors.push('La información de contacto no puede exceder los 255 caracteres.');
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
      const err = new Error('El ID de laboratorio debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener todos los laboratorios con el conteo de medicamentos asociados.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>} Lista de laboratorios.
   */
  static async getAllWithProductCount(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        l.id, 
        l.name, 
        COALESCE(l.country, 'Perú') AS country, 
        COALESCE(l.contact, '') AS contact, 
        l.created_at AS "createdAt", 
        COUNT(p.id)::int AS "productCount"
      FROM laboratorios l
      LEFT JOIN productos p ON LOWER(l.name) = LOWER(p.laboratory)
      GROUP BY l.id
      ORDER BY l.name ASC;
    `);
  }

  /**
   * Buscar un laboratorio por su ID numérico.
   * @param {number|string} id - ID del laboratorio.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = LaboratoryModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id, 
        name, 
        COALESCE(country, 'Perú') AS country, 
        COALESCE(contact, '') AS contact, 
        created_at AS "createdAt"
      FROM laboratorios
      WHERE id = $1
      LIMIT 1;
    `, [validId]);
  }

  /**
   * Buscar un laboratorio por su nombre insensible a mayúsculas.
   * @param {string} name - Nombre del laboratorio.
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
        name, 
        COALESCE(country, 'Perú') AS country, 
        COALESCE(contact, '') AS contact, 
        created_at AS "createdAt"
      FROM laboratorios
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1;
    `, [cleanName]);
  }

  /**
   * Contar la cantidad de medicamentos asociados a un laboratorio por su nombre.
   * @param {string} labName - Nombre del laboratorio.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<number>}
   */
  static async countProductsByLabName(labName, dbClient) {
    if (!labName) return 0;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    const row = await getFn(`
      SELECT COUNT(*)::int AS count 
      FROM productos 
      WHERE LOWER(laboratory) = LOWER($1);
    `, [String(labName).trim()]);

    return row ? parseInt(row.count, 10) : 0;
  }

  /**
   * Crear un nuevo laboratorio con validaciones defensivas de unicidad.
   * @param {Object} data - { name, country, contact }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Laboratorio creado.
   */
  static async create(data, dbClient) {
    LaboratoryModel.validate(data, false);

    const cleanName = data.name.trim();
    const cleanCountry = data.country ? data.country.trim() : 'Perú';
    const cleanContact = data.contact ? data.contact.trim() : '';

    // 1. Verificar duplicidad
    const existing = await LaboratoryModel.findByName(cleanName, dbClient);
    if (existing) {
      const err = new Error(`El laboratorio "${cleanName}" ya existe en el sistema.`);
      err.statusCode = 409;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      INSERT INTO laboratorios (name, country, contact)
      VALUES ($1, $2, $3)
      RETURNING 
        id, 
        name, 
        country, 
        contact, 
        created_at AS "createdAt";
    `, [cleanName, cleanCountry, cleanContact]);
  }

  /**
   * Actualizar un laboratorio existente y propagar cambios de nombre si corresponde.
   * @param {number|string} id - ID del laboratorio.
   * @param {Object} data - { name, country, contact }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Laboratorio actualizado.
   */
  static async update(id, data, dbClient) {
    const validId = LaboratoryModel.validateId(id);
    LaboratoryModel.validate(data, true);

    // 1. Verificar existencia
    const current = await LaboratoryModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Laboratorio #${validId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    const newName = data.name ? data.name.trim() : current.name;
    const newCountry = data.country !== undefined ? data.country.trim() : current.country;
    const newContact = data.contact !== undefined ? data.contact.trim() : current.contact;

    // 2. Si cambia el nombre, verificar que no colisione con otro
    if (newName.toLowerCase() !== current.name.toLowerCase()) {
      const duplicate = await LaboratoryModel.findByName(newName, dbClient);
      if (duplicate && duplicate.id !== validId) {
        const err = new Error(`El nombre de laboratorio "${newName}" ya pertenece a otro registro.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    const updated = await getFn(`
      UPDATE laboratorios 
      SET name = $1, country = $2, contact = $3
      WHERE id = $4
      RETURNING 
        id, 
        name, 
        country, 
        contact, 
        created_at AS "createdAt";
    `, [newName, newCountry, newContact, validId]);

    // 3. Sincronización en cascada: Si cambió el nombre, actualizar productos asociados
    if (newName !== current.name) {
      await runFn(`
        UPDATE productos 
        SET laboratory = $1 
        WHERE LOWER(laboratory) = LOWER($2);
      `, [newName, current.name]);
    }

    return updated;
  }

  /**
   * Eliminar un laboratorio con protección contra huérfanos.
   * @param {number|string} id - ID del laboratorio.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Laboratorio eliminado.
   */
  static async delete(id, dbClient) {
    const validId = LaboratoryModel.validateId(id);

    // 1. Verificar existencia
    const lab = await LaboratoryModel.findById(validId, dbClient);
    if (!lab) {
      const err = new Error(`Laboratorio #${validId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Verificar si tiene medicamentos asociados
    const count = await LaboratoryModel.countProductsByLabName(lab.name, dbClient);
    if (count > 0) {
      const err = new Error(`No se puede eliminar "${lab.name}" porque tiene ${count} medicamento(s) asociado(s). Reasigne los productos primero.`);
      err.statusCode = 409;
      throw err;
    }

    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;
    await runFn(`DELETE FROM laboratorios WHERE id = $1;`, [validId]);

    return lab;
  }

  /**
   * Reasignar masivamente medicamentos de un laboratorio a otro.
   * @param {string} sourceLabName - Laboratorio de origen.
   * @param {string} targetLabName - Laboratorio de destino.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<{ reassignedCount: number }>}
   */
  static async reassignProducts(sourceLabName, targetLabName, dbClient) {
    if (!sourceLabName || !targetLabName || typeof sourceLabName !== 'string' || typeof targetLabName !== 'string') {
      const err = new Error('Debe especificar un laboratorio de origen y uno de destino.');
      err.statusCode = 400;
      throw err;
    }

    const src = sourceLabName.trim();
    const dst = targetLabName.trim();

    if (src.toLowerCase() === dst.toLowerCase()) {
      const err = new Error('El laboratorio de origen y el de destino deben ser diferentes.');
      err.statusCode = 400;
      throw err;
    }

    const count = await LaboratoryModel.countProductsByLabName(src, dbClient);
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    await runFn(`
      UPDATE productos 
      SET laboratory = $1 
      WHERE LOWER(laboratory) = LOWER($2);
    `, [dst, src]);

    return { reassignedCount: count };
  }
}

module.exports = LaboratoryModel;
