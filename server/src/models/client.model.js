const { query, get, run } = require('../db');

/**
 * ============================================================================
 * VALETEC PHARMA - MODELO: CLIENT (CLIENTES Y PADRÓN FISCAL DNI / RUC)
 * ============================================================================
 * Representa los clientes y pacientes de la botica con sus datos de facturación
 * y saldo de puntos. Encapsula validaciones fiscales y sanitarias peruanas.
 */
class ClientModel {
  /**
   * Tipos de documento reconocidos por SUNAT y el sistema
   */
  static ALLOWED_DOC_TYPES = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

  /**
   * Validaciones defensivas de integridad para los atributos de un cliente.
   * Regla #2: Validación estricta antes de interactuar con la base de datos.
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    const docType = data.documentType ? String(data.documentType).trim().toUpperCase() : (isUpdate ? undefined : 'DNI');
    const docNum = data.documentNumber !== undefined ? String(data.documentNumber).trim() : undefined;

    // 1. Validación de 'documentType'
    if (docType !== undefined) {
      if (!ClientModel.ALLOWED_DOC_TYPES.includes(docType)) {
        errors.push(`El tipo de documento debe ser uno de los siguientes: ${ClientModel.ALLOWED_DOC_TYPES.join(', ')}.`);
      }
    }

    // 2. Validación de 'documentNumber'
    if (!isUpdate || docNum !== undefined) {
      if (!docNum || docNum.length === 0) {
        errors.push('El número de documento es obligatorio.');
      } else {
        const typeToCheck = docType || 'DNI';

        if (typeToCheck === 'DNI' && docNum !== '00000000') {
          if (!/^\d{8}$/.test(docNum)) {
            errors.push('El DNI debe contener exactamente 8 dígitos numéricos.');
          }
        } else if (typeToCheck === 'RUC') {
          if (!/^\d{11}$/.test(docNum)) {
            errors.push('El RUC debe contener exactamente 11 dígitos numéricos.');
          } else if (!['10', '20', '15', '17'].some(prefix => docNum.startsWith(prefix))) {
            errors.push('El RUC debe iniciar con 10, 20, 15 o 17 conforme a normativa fiscal de SUNAT.');
          }
        } else if (typeToCheck === 'CE' || typeToCheck === 'PASAPORTE') {
          if (docNum.length < 4 || docNum.length > 20) {
            errors.push(`El documento ${typeToCheck} debe tener entre 4 y 20 caracteres.`);
          }
        }
      }
    }

    // 3. Validación de 'fullName' (o Razón Social)
    if (!isUpdate || data.fullName !== undefined) {
      if (!data.fullName || typeof data.fullName !== 'string') {
        errors.push('El nombre completo o razón social es obligatorio.');
      } else {
        const cleanName = data.fullName.trim();
        if (cleanName.length < 3 || cleanName.length > 200) {
          errors.push('El nombre completo o razón social debe tener entre 3 y 200 caracteres.');
        }
      }
    }

    // 4. Validación de 'email' (opcional)
    if (data.email !== undefined && data.email !== null && String(data.email).trim() !== '') {
      const cleanEmail = String(data.email).trim();
      if (cleanEmail.length > 150) {
        errors.push('El correo electrónico no puede exceder los 150 caracteres.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.push('El formato del correo electrónico es inválido.');
      }
    }

    // 5. Validación de 'phone' (opcional)
    if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() !== '') {
      const cleanPhone = String(data.phone).trim();
      if (cleanPhone.length > 50) {
        errors.push('El teléfono no puede exceder los 50 caracteres.');
      }
    }

    // 6. Validación de 'pointsBalance' (opcional)
    if (data.pointsBalance !== undefined && data.pointsBalance !== null) {
      const points = parseInt(data.pointsBalance, 10);
      if (isNaN(points) || points < 0) {
        errors.push('El saldo de puntos debe ser un número entero mayor o igual a cero.');
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
      const err = new Error('El ID de cliente debe ser un número entero positivo mayor a cero.');
      err.statusCode = 400;
      throw err;
    }
    return numId;
  }

  /**
   * Obtener clientes con soporte de paginación y filtros o lista completa para el frontend.
   * @param {Object} [options] - Opciones: { page, limit, search }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array|Object>}
   */
  static async getAll(options = {}, dbClient = null) {
    let opts = options;
    let client = dbClient;
    if (options && (options.query || options.connect)) {
      client = options;
      opts = {};
    }

    const queryFn = (client && client.query) ? client.query.bind(client) : query;
    const isPaginated = opts && (opts.page !== undefined || opts.limit !== undefined);

    const conditions = [];
    const params = [];

    if (opts.search && typeof opts.search === 'string' && opts.search.trim() !== '') {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR document_number ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let paginationClause = '';
    let pageNum = 1;
    let limitNum = 50;

    if (isPaginated) {
      pageNum = Math.max(parseInt(opts.page || 1, 10), 1);
      limitNum = Math.min(Math.max(parseInt(opts.limit || 50, 10), 1), 200);
      const offset = (pageNum - 1) * limitNum;
      params.push(limitNum);
      const limitIdx = params.length;
      params.push(offset);
      const offsetIdx = params.length;
      paginationClause = `LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    }

    const rows = await queryFn(`
      SELECT 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        COUNT(*) OVER() AS full_count
      FROM clientes
      ${whereClause}
      ORDER BY full_name ASC
      ${paginationClause};
    `, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;
    const formatted = rows.map(r => {
      const { full_count, ...clean } = r;
      return clean;
    });

    if (isPaginated) {
      return {
        data: formatted,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1
        }
      };
    }

    return formatted;
  }

  /**
   * Búsqueda predictiva rápida para el mostrador de ventas (POS) por DNI, RUC o Nombre.
   * @param {string} term - Término de búsqueda.
   * @param {number} [limit=10] - Límite de resultados.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>}
   */
  static async search(term, limit = 10, dbClient) {
    if (!term || typeof term !== 'string' || term.trim() === '') {
      return [];
    }
    const cleanTerm = term.trim();
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance"
      FROM clientes
      WHERE document_number ILIKE $1 OR full_name ILIKE $1
      ORDER BY 
        CASE WHEN document_number = $2 THEN 0 ELSE 1 END,
        full_name ASC
      LIMIT $3;
    `, [`%${cleanTerm}%`, cleanTerm, limit]);
  }

  /**
   * Buscar un cliente por su ID numérico.
   * @param {number|string} id - ID del cliente.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findById(id, dbClient) {
    const validId = ClientModel.validateId(id);
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM clientes
      WHERE id = $1;
    `, [validId]);
  }

  /**
   * Buscar cliente por número de documento exacto (DNI o RUC).
   * @param {string} documentNumber - Número de documento.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object|null>}
   */
  static async findByDoc(documentNumber, dbClient) {
    if (!documentNumber) return null;
    const cleanDoc = String(documentNumber).trim();
    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      SELECT 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt"
      FROM clientes
      WHERE document_number = $1
      LIMIT 1;
    `, [cleanDoc]);
  }

  /**
   * Registrar un nuevo cliente con validaciones fiscales y de unicidad.
   * @param {Object} data - Datos: { documentType, documentNumber, fullName, address, phone, email }
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Cliente creado.
   */
  static async create(data, dbClient) {
    ClientModel.validate(data, false);

    const docType = (data.documentType ? String(data.documentType).trim().toUpperCase() : 'DNI');
    const docNum = String(data.documentNumber).trim();
    const name = String(data.fullName).trim();

    // 1. Validar que no exista un cliente con ese mismo documento
    const existing = await ClientModel.findByDoc(docNum, dbClient);
    if (existing) {
      const err = new Error(`El cliente con documento ${docNum} ya se encuentra registrado.`);
      err.statusCode = 409;
      throw err;
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    // 2. Insertar en PostgreSQL
    return await getFn(`
      INSERT INTO clientes (
        document_type, document_number, full_name, address, phone, email, points_balance
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt";
    `, [
      docType,
      docNum,
      name,
      data.address ? String(data.address).trim() : '',
      data.phone ? String(data.phone).trim() : '',
      data.email ? String(data.email).trim() : ''
    ]);
  }

  /**
   * Actualizar datos de un cliente existente.
   * @param {number|string} id - ID del cliente.
   * @param {Object} data - Campos a modificar.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Object>} Cliente actualizado.
   */
  static async update(id, data, dbClient) {
    const validId = ClientModel.validateId(id);
    ClientModel.validate(data, true);

    // 1. Verificar existencia previa
    const current = await ClientModel.findById(validId, dbClient);
    if (!current) {
      const err = new Error(`Cliente #${validId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Si se modifica el número de documento, verificar que no colisione con otro cliente
    if (data.documentNumber) {
      const cleanDoc = String(data.documentNumber).trim();
      if (cleanDoc !== current.documentNumber) {
        const dup = await ClientModel.findByDoc(cleanDoc, dbClient);
        if (dup && dup.id !== validId) {
          const err = new Error(`El documento ${cleanDoc} ya está registrado para otro cliente.`);
          err.statusCode = 409;
          throw err;
        }
      }
    }

    const getFn = (dbClient && dbClient.get) ? dbClient.get.bind(dbClient) : get;

    return await getFn(`
      UPDATE clientes SET
        document_type = COALESCE($1, document_type),
        document_number = COALESCE($2, document_number),
        full_name = COALESCE($3, full_name),
        address = COALESCE($4, address),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        points_balance = COALESCE($7, points_balance)
      WHERE id = $8
      RETURNING 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "createdAt";
    `, [
      data.documentType ? String(data.documentType).trim().toUpperCase() : null,
      data.documentNumber ? String(data.documentNumber).trim() : null,
      data.fullName ? String(data.fullName).trim() : null,
      data.address !== undefined ? String(data.address).trim() : null,
      data.phone !== undefined ? String(data.phone).trim() : null,
      data.email !== undefined ? String(data.email).trim() : null,
      data.pointsBalance !== undefined ? parseInt(data.pointsBalance, 10) : null,
      validId
    ]);
  }

  /**
   * Obtener el historial de compras y comprobantes de un cliente.
   * @param {string} documentNumber - Número de DNI o RUC del cliente.
   * @param {Object} [dbClient] - Cliente transaccional opcional.
   * @returns {Promise<Array>} Lista de comprobantes emitidos.
   */
  static async getPurchaseHistory(documentNumber, dbClient) {
    if (!documentNumber) return [];
    const cleanDoc = String(documentNumber).trim();
    const queryFn = (dbClient && dbClient.query) ? dbClient.query.bind(dbClient) : query;

    return await queryFn(`
      SELECT 
        v.id,
        v.invoice_series AS "series",
        v.invoice_number AS "number",
        v.invoice_type AS "invoiceType",
        v.total,
        v.payment_method AS "paymentMethod",
        v.status,
        v.created_at AS "createdAt"
      FROM ventas v
      WHERE v.customer_doc = $1
      ORDER BY v.id DESC
      LIMIT 20;
    `, [cleanDoc]);
  }
}

module.exports = ClientModel;
