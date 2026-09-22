const { query, get, run } = require('../db');

/**
 * Obtener listado de clientes
 */
async function getAllClients(req, res, next) {
  try {
    const clients = await query(`
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
      ORDER BY full_name ASC;
    `);

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Búsqueda predictiva de cliente por DNI, RUC o Nombre para el Mostrador de Ventas (POS)
 */
async function searchClients(req, res, next) {
  try {
    const q = req.query.query ? req.query.query.trim() : '';
    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    const clients = await query(`
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
      LIMIT 10;
    `, [`%${q}%`, q]);

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Obtener un cliente por ID
 */
async function getClientById(req, res, next) {
  try {
    const { id } = req.params;
    const client = await get(`
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
    `, [id]);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Cliente #${id} no encontrado.`
      });
    }

    res.status(200).json({
      success: true,
      data: client
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar un nuevo cliente con validación de DNI / RUC
 */
async function createClient(req, res, next) {
  try {
    const { documentType, documentNumber, fullName, address, phone, email } = req.body;

    if (!documentNumber || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'El número de documento y el nombre completo (o razón social) son obligatorios.'
      });
    }

    const docType = documentType ? documentType.toUpperCase() : 'DNI';
    const docNum = documentNumber.trim();
    const name = fullName.trim();

    // Validaciones sanitarias y fiscales peruanas
    if (docType === 'DNI' && docNum !== '00000000') {
      if (!/^\d{8}$/.test(docNum)) {
        return res.status(400).json({
          success: false,
          message: 'El DNI debe tener exactamente 8 dígitos numéricos.'
        });
      }
    } else if (docType === 'RUC') {
      if (!/^\d{11}$/.test(docNum)) {
        return res.status(400).json({
          success: false,
          message: 'El RUC debe tener exactamente 11 dígitos numéricos.'
        });
      }
      if (!docNum.startsWith('10') && !docNum.startsWith('20') && !docNum.startsWith('15') && !docNum.startsWith('17')) {
        return res.status(400).json({
          success: false,
          message: 'El RUC debe iniciar con 10, 20, 15 o 17 conforme a normativa SUNAT.'
        });
      }
    }

    // Verificar duplicidad
    const dup = await get('SELECT id FROM clientes WHERE document_number = $1', [docNum]);
    if (dup) {
      return res.status(409).json({
        success: false,
        message: `El cliente con documento ${docNum} ya se encuentra registrado.`
      });
    }

    const newClient = await get(`
      INSERT INTO clientes (document_type, document_number, full_name, address, phone, email, points_balance)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance";
    `, [docType, docNum, name, address ? address.trim() : '', phone ? phone.trim() : '', email ? email.trim() : '']);

    res.status(201).json({
      success: true,
      message: `Cliente "${name}" registrado exitosamente.`,
      data: newClient
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar cliente existente
 */
async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const { documentType, documentNumber, fullName, address, phone, email } = req.body;

    const client = await get('SELECT * FROM clientes WHERE id = $1', [id]);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Cliente #${id} no encontrado.`
      });
    }

    if (documentNumber && documentNumber !== client.document_number) {
      const dup = await get('SELECT id FROM clientes WHERE document_number = $1 AND id != $2', [documentNumber.trim(), id]);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `El documento ${documentNumber} ya está registrado para otro cliente.`
        });
      }
    }

    const updated = await get(`
      UPDATE clientes SET
        document_type = COALESCE($1, document_type),
        document_number = COALESCE($2, document_number),
        full_name = COALESCE($3, full_name),
        address = COALESCE($4, address),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        updated_at = NOW()
      WHERE id = $7
      RETURNING 
        id,
        document_type AS "documentType",
        document_number AS "documentNumber",
        full_name AS "fullName",
        COALESCE(address, '') AS "address",
        COALESCE(phone, '') AS "phone",
        COALESCE(email, '') AS "email",
        points_balance AS "pointsBalance";
    `, [
      documentType ? documentType.toUpperCase() : null,
      documentNumber ? documentNumber.trim() : null,
      fullName ? fullName.trim() : null,
      address !== undefined ? address.trim() : null,
      phone !== undefined ? phone.trim() : null,
      email !== undefined ? email.trim() : null,
      id
    ]);

    res.status(200).json({
      success: true,
      message: `Cliente "${updated.fullName}" actualizado correctamente.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllClients,
  searchClients,
  getClientById,
  createClient,
  updateClient
};
