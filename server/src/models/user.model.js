const bcrypt = require('bcryptjs');
const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: USER (USUARIOS, EMPLEADOS Y AUTENTICACIÓN)
 * ============================================================================
 * Representa los colaboradores de la farmacia vinculados a sus roles.
 * Encapsula la persistencia, validaciones de seguridad y hashing de contraseñas.
 */
class UserModel {
  /**
   * Validaciones defensivas de integridad para los atributos de un usuario.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // 1. Validación de 'name'
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('El nombre completo es obligatorio.');
      } else {
        const cleanName = data.name.trim();
        if (cleanName.length < 3 || cleanName.length > 150) {
          errors.push('El nombre debe tener entre 3 y 150 caracteres.');
        }
      }
    }

    // 2. Validación de 'email'
    if (!isUpdate || data.email !== undefined) {
      if (!data.email || typeof data.email !== 'string') {
        errors.push('El correo electrónico es obligatorio.');
      } else {
        const cleanEmail = data.email.trim();
        if (cleanEmail.length > 150) {
          errors.push('El correo electrónico no puede exceder los 150 caracteres.');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          errors.push('El formato del correo electrónico es inválido (ej: usuario@valetec.pe).');
        }
      }
    }

    // 3. Validación de 'role_id'
    if (!isUpdate || data.roleId !== undefined || data.role_id !== undefined) {
      const roleVal = data.roleId !== undefined ? data.roleId : data.role_id;
      const numRole = parseInt(roleVal, 10);
      if (isNaN(numRole) || numRole <= 0) {
        errors.push('Debe asignarse un rol válido (número entero positivo).');
      }
    }

    // 4. Validación de 'password' (solo exigible en creación directa)
    if (!isUpdate && !data.password && !data.password_hash) {
      errors.push('La contraseña es obligatoria para registrar un usuario nuevo.');
    } else if (data.password !== undefined && data.password !== null) {
      if (typeof data.password !== 'string' || data.password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres.');
      } else if (data.password.length > 100) {
        errors.push('La contraseña no puede exceder los 100 caracteres.');
      }
    }

    // 5. Validación de 'status'
    if (data.status !== undefined && data.status !== null) {
      const validStatuses = ['active', 'inactive', 'pending'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`El estado debe ser uno de los siguientes: ${validStatuses.join(', ')}.`);
      }
    }

    // 6. Validaciones de campos de texto opcionales
    if (data.target && typeof data.target === 'string' && data.target.length > 100) {
      errors.push('La meta no puede exceder los 100 caracteres.');
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
      const err = new Error('El ID de usuario debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Buscar usuario por email insensible a mayúsculas con credenciales completas para Login.
   * Incluye datos del rol y el password_hash de PostgreSQL.
   * @param {string} email - Correo del usuario.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findByEmailWithRole(email, dbClient) {
    if (!email || typeof email !== 'string') return null;
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        u.id,
        u.role_id,
        r.name AS "role_name",
        r.label AS "role_label",
        u.name,
        u.email,
        u.password_hash,
        u.permissions,
        u.target,
        u.status,
        u.created_at AS "createdAt"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1;
    `, [email.trim()]);
  }

  /**
   * Buscar usuario por su ID sin exponer el hash de contraseña (perfil público seguro).
   * @param {number|string} id - ID del usuario.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = UserModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        u.id,
        u.role_id AS "roleId",
        r.name AS "roleKey",
        r.label AS "roleLabel",
        u.name,
        u.email,
        u.permissions,
        u.target,
        u.status,
        u.created_at AS "createdAt"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
      LIMIT 1;
    `, [validId]);
  }

  static async getAll(dbClient) {
    return await UserModel.getAllWithRoles(dbClient);
  }

  /**
   * Obtener todos los colaboradores registrados con sus respectivos roles.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>} Lista de usuarios.
   */
  static async getAllWithRoles(dbClient) {
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.dni,
        r.name AS "roleKey",
        r.label AS "roleLabel",
        u.permissions,
        u.target,
        u.status,
        u.created_at AS "createdAt"
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC;
    `);
  }

  /**
   * Crear un nuevo usuario en PostgreSQL aplicando validaciones y hash seguro bcrypt.
   * @param {Object} data - Datos: { roleId, name, email, password, permissions, target, status }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Usuario creado (sin contraseña).
   */
  static async create(data, dbClient) {
    UserModel.validate(data, false);

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const roleId = parseInt(data.roleId || data.role_id, 10);

    // 1. Verificar unicidad de correo
    const existing = await UserModel.findByEmailWithRole(cleanEmail, dbClient);
    if (existing) {
      const err = new Error(`El correo "${cleanEmail}" ya se encuentra registrado.`);
      err.statusCode = 409;
      throw err;
    }

    // 2. Hashear contraseña si viene en texto plano
    let hash = data.password_hash;
    if (data.password) {
      const salt = bcrypt.genSaltSync(10);
      hash = bcrypt.hashSync(data.password, salt);
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    // 3. Insertar registro
    return await getFn(`
      INSERT INTO usuarios (
        role_id, name, email, password_hash, permissions, target, dni, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        role_id AS "roleId",
        name,
        email,
        permissions,
        target,
        dni,
        status,
        created_at AS "createdAt";
    `, [
      roleId,
      cleanName,
      cleanEmail,
      hash,
      data.permissions ? data.permissions.trim() : null,
      data.target ? data.target.trim() : null,
      data.dni ? String(data.dni).trim() : null,
      data.status || 'active'
    ]);
  }

  /**
   * Actualizar datos generales de un usuario.
   * @param {number|string} id - ID del usuario.
   * @param {Object} data - Campos a modificar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Usuario actualizado.
   */
  static async update(id, data, dbClient) {
    const validId = UserModel.validateId(id);
    UserModel.validate(data, true);

    // 1. Verificar existencia
    const current = await UserModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`No se encontró ningún usuario con ID ${validId}.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Si se actualiza email, verificar duplicidad
    if (data.email) {
      const cleanEmail = data.email.trim().toLowerCase();
      const existing = await UserModel.findByEmailWithRole(cleanEmail, dbClient);
      if (existing && existing.id !== validId) {
        const err = new Error(`El correo "${cleanEmail}" ya está en uso por otro usuario.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const roleId = (data.roleId !== undefined || data.role_id !== undefined)
      ? parseInt(data.roleId || data.role_id, 10)
      : null;

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      UPDATE usuarios
      SET
        role_id = COALESCE($1, role_id),
        name = COALESCE($2, name),
        email = COALESCE($3, email),
        permissions = COALESCE($4, permissions),
        target = COALESCE($5, target),
        status = COALESCE($6, status)
      WHERE id = $7
      RETURNING 
        id,
        role_id AS "roleId",
        name,
        email,
        permissions,
        target,
        status,
        created_at AS "createdAt";
    `, [
      roleId,
      data.name ? data.name.trim() : null,
      data.email ? data.email.trim().toLowerCase() : null,
      data.permissions !== undefined ? (data.permissions ? data.permissions.trim() : null) : null,
      data.target !== undefined ? (data.target ? data.target.trim() : null) : null,
      data.status || null,
      validId
    ]);
  }

  /**
   * Actualizar la contraseña de un usuario con encriptación bcrypt.
   * @param {number|string} id - ID del usuario.
   * @param {string} newPassword - Nueva contraseña en texto plano (mínimo 6 caracteres).
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<boolean>}
   */
  static async updatePassword(id, newPassword, dbClient) {
    const validId = UserModel.validateId(id);

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      const err = new Error('La nueva contraseña debe tener al menos 6 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    const runFn = (dbClient && dbClient.run) ? dbClient.run.bind(dbClient) : run;
    await runFn(`UPDATE usuarios SET password_hash = $1 WHERE id = $2;`, [hash, validId]);
    return true;
  }

  /**
   * Comparar contraseña en texto plano con el hash guardado en PostgreSQL.
   * @param {string} plainPassword - Contraseña ingresada.
   * @param {string} passwordHash - Hash almacenado.
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(plainPassword, passwordHash) {
    if (!plainPassword || !passwordHash) return false;
    return await bcrypt.compare(plainPassword, passwordHash);
  }
}

module.exports = UserModel;
