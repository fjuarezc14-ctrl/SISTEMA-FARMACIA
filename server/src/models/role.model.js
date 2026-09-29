const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: ROLE (ROLES Y PERMISOS DE ACCESO)
 * ============================================================================
 * Representa la entidad de roles del sistema ('admin', 'qf', 'cashier', 'tech').
 * Encapsula la lógica de acceso a datos y las validaciones de negocio defensivas.
 */
class RoleModel {
  /**
   * Validaciones defensivas de integridad para los atributos de un rol.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Validación de 'name' (identificador clave del rol)
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('El campo "name" es obligatorio y debe ser una cadena de texto.');
      } else {
        const cleanName = data.name.trim();
        if (cleanName.length < 2 || cleanName.length > 50) {
          errors.push('El campo "name" debe tener entre 2 y 50 caracteres.');
        }
        if (!/^[a-z0-9_]+$/.test(cleanName)) {
          errors.push('El campo "name" solo permite letras minúsculas, números y guiones bajos (ej: "cashier_night").');
        }
      }
    }

    // 2. Validación de 'label' (nombre legible para la interfaz)
    if (!isUpdate || data.label !== undefined) {
      if (!data.label || typeof data.label !== 'string') {
        errors.push('El campo "label" es obligatorio y debe ser una cadena de texto.');
      } else {
        const cleanLabel = data.label.trim();
        if (cleanLabel.length < 3 || cleanLabel.length > 100) {
          errors.push('El campo "label" debe tener entre 3 y 100 caracteres.');
        }
      }
    }

    // 3. Validación de 'description' (opcional)
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push('El campo "description" debe ser una cadena de texto.');
      } else if (data.description.trim().length > 255) {
        errors.push('El campo "description" no puede exceder los 255 caracteres.');
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
      const err = new Error('El ID del rol debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener todos los roles disponibles en el sistema.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>} Lista de roles ordenados por ID.
   */
  static async getAll(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;
    return await queryFn(`
      SELECT 
        id,
        name,
        label,
        description,
        created_at AS "createdAt"
      FROM roles
      ORDER BY id ASC;
    `);
  }

  /**
   * Buscar un rol por su ID numérico.
   * @param {number|string} id - ID del rol.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>} Rol encontrado o null.
   */
  static async findById(id, dbClient) {
    const validId = RoleModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id,
        name,
        label,
        description,
        created_at AS "createdAt"
      FROM roles
      WHERE id = $1
      LIMIT 1;
    `, [validId]);
  }

  /**
   * Buscar un rol por su clave única ('admin', 'qf', 'cashier', etc.).
   * @param {string} name - Nombre único del rol.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>} Rol encontrado o null.
   */
  static async findByName(name, dbClient) {
    if (!name || typeof name !== 'string') return null;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id,
        name,
        label,
        description,
        created_at AS "createdAt"
      FROM roles
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1;
    `, [name.trim()]);
  }

  /**
   * Crear un nuevo rol con validaciones defensivas y control de unicidad.
   * @param {Object} data - Datos del rol: { name, label, description }.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} El rol creado.
   */
  static async create(data, dbClient) {
    // 1. Validar datos
    RoleModel.validate(data, false);

    const cleanName = data.name.trim().toLowerCase();
    const cleanLabel = data.label.trim();
    const cleanDesc = data.description ? data.description.trim() : null;

    // 2. Verificar que no exista un rol con el mismo name
    const existing = await RoleModel.findByName(cleanName, dbClient);
    if (existing) {
      const err = new Error(`El rol con clave "${cleanName}" ya se encuentra registrado.`);
      err.statusCode = 409;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    // 3. Insertar en PostgreSQL
    return await getFn(`
      INSERT INTO roles (name, label, description)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        name,
        label,
        description,
        created_at AS "createdAt";
    `, [cleanName, cleanLabel, cleanDesc]);
  }

  /**
   * Actualizar un rol existente.
   * @param {number|string} id - ID del rol a modificar.
   * @param {Object} data - Atributos a modificar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} El rol actualizado.
   */
  static async update(id, data, dbClient) {
    const validId = RoleModel.validateId(id);

    // 1. Validar datos para actualización
    RoleModel.validate(data, true);

    // 2. Verificar existencia previa
    const current = await RoleModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`No se encontró ningún rol con ID ${validId}.`);
      err.statusCode = 404;
      throw err;
    }

    // 3. Si se cambia el 'name', verificar colisión con otro rol
    if (data.name) {
      const cleanName = data.name.trim().toLowerCase();
      const duplicate = await RoleModel.findByName(cleanName, dbClient);
      if (duplicate && duplicate.id !== validId) {
        const err = new Error(`La clave de rol "${cleanName}" ya está en uso por otro registro.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      UPDATE roles
      SET
        name = COALESCE($1, name),
        label = COALESCE($2, label),
        description = COALESCE($3, description)
      WHERE id = $4
      RETURNING 
        id,
        name,
        label,
        description,
        created_at AS "createdAt";
    `, [
      data.name ? data.name.trim().toLowerCase() : null,
      data.label ? data.label.trim() : null,
      data.description !== undefined ? (data.description ? data.description.trim() : null) : null,
      validId
    ]);
  }

  /**
   * Eliminar un rol garantizando integridad referencial con usuarios.
   * @param {number|string} id - ID del rol a eliminar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<boolean>} True si fue eliminado.
   */
  static async delete(id, dbClient) {
    const validId = RoleModel.validateId(id);

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;
    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;

    // 1. Verificar si existen usuarios asignados a este rol
    const usersCount = await getFn(`
      SELECT COUNT(*) as count 
      FROM usuarios 
      WHERE role_id = $1;
    `, [validId]);

    if (usersCount && parseInt(usersCount.count, 10) > 0) {
      const err = new Error(`No se puede eliminar el rol ID ${validId} porque tiene ${usersCount.count} usuario(s) asignado(s). Reasigne los usuarios antes de eliminar.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Ejecutar eliminación
    const result = await runFn(`DELETE FROM roles WHERE id = $1;`, [validId]);
    return result.changes > 0 || true;
  }
}

module.exports = RoleModel;
