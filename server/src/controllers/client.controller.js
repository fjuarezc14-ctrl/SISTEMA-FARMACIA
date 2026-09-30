const ClientModel = require('../models/client.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: CLIENT (PADRÓN FISCAL DNI / RUC Y PACIENTES)
 * ============================================================================
 * Orquesta la búsqueda predictiva para el mostrador POS y el padrón de clientes.
 * Las validaciones de formato de DNI/RUC y la persistencia residen en ClientModel.
 */

/**
 * GET /api/clients
 * Obtener listado de todos los clientes
 */
async function getAllClients(req, res, next) {
  try {
    const { page, limit, search } = req.query;
    const hasPagination = page !== undefined || limit !== undefined;

    const result = await ClientModel.getAll({ page, limit, search });

    if (hasPagination) {
      return res.status(200).json({
        success: true,
        count: result.data.length,
        pagination: result.pagination,
        data: result.data
      });
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/clients/search
 * Búsqueda predictiva de cliente por DNI, RUC o Nombre para el Mostrador de Ventas (POS)
 */
async function searchClients(req, res, next) {
  try {
    const q = req.query.query ? req.query.query.trim() : '';
    if (!q) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const clients = await ClientModel.search(q, 10);

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
 * GET /api/clients/:id
 * Obtener un cliente por su ID
 */
async function getClientById(req, res, next) {
  try {
    const { id } = req.params;
    const client = await ClientModel.findById(id);

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
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * POST /api/clients
 * Registrar un nuevo cliente con validación sanitaria y fiscal de DNI / RUC
 */
async function createClient(req, res, next) {
  try {
    const newClient = await ClientModel.create(req.body);

    res.status(201).json({
      success: true,
      message: `Cliente "${newClient.fullName}" registrado exitosamente.`,
      data: newClient
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * PUT /api/clients/:id
 * Actualizar cliente existente con validación de no duplicidad de documento
 */
async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await ClientModel.update(id, req.body);

    res.status(200).json({
      success: true,
      message: `Cliente "${updated.fullName}" actualizado correctamente.`,
      data: updated
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
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
