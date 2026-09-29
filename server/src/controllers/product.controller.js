const ProductModel = require('../models/product.model');

/**
 * ============================================================================
 * VALETEC PHARMA - CONTROLADOR: PRODUCT (CATÁLOGO, PRECIOS Y LOTES FEFO)
 * ============================================================================
 * Orquesta el catálogo maestro de medicamentos, precios por fracción (caja,
 * blíster, unidad), ingreso de stock y auditoría de caducidades FEFO.
 */

/**
 * GET /api/products
 * Obtener todos los productos con categorías y lotes FEFO agregados
 */
async function getAllProducts(req, res, next) {
  try {
    const { page, limit, search, category, categorySlug, status } = req.query;
    const hasPagination = page !== undefined || limit !== undefined;

    const result = await ProductModel.getAll({
      page,
      limit,
      search,
      categorySlug: categorySlug || category,
      status
    });

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
      source: 'PostgreSQL 16',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 * Obtener un producto por ID con ficha técnica y lotes detallados
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const prod = await ProductModel.findById(id);

    if (!prod) {
      return res.status(404).json({
        success: false,
        message: `Producto #${id} no encontrado en la base de datos.`
      });
    }

    res.status(200).json({
      success: true,
      data: prod
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
 * POST /api/products
 * Crear un nuevo producto en el catálogo maestro y su lote inicial opcional
 */
async function createProduct(req, res, next) {
  try {
    const newProd = await ProductModel.create(req.body);

    res.status(201).json({
      success: true,
      message: `Medicamento "${newProd.name}" registrado exitosamente.`,
      data: newProd
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
 * PUT /api/products/:id
 * Actualizar datos técnicos o precios de un producto
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await ProductModel.update(id, req.body);

    res.status(200).json({
      success: true,
      message: `Medicamento "${updated.name}" actualizado correctamente.`,
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

/**
 * PATCH /api/products/:id/status
 * Activar o desactivar un producto del catálogo
 */
async function toggleProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const updated = await ProductModel.toggleStatus(id, status);

    res.status(200).json({
      success: true,
      status: updated.status,
      message: `Producto "${updated.name}" ${updated.status === 'active' ? 'activado' : 'desactivado'} correctamente.`,
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

/**
 * POST /api/products/add-stock
 * Ingreso de mercadería / stock al almacén
 */
async function addStock(req, res, next) {
  try {
    const { productId, lotNumber, expireDate, boxes, location } = req.body;

    if (!productId || !boxes || boxes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: productId y boxes son requeridos.'
      });
    }

    const result = await ProductModel.addStock({
      productId,
      lotNumber,
      expireDate,
      boxes,
      location
    });

    res.status(201).json({
      success: true,
      message: 'Mercadería ingresada al Kardex con éxito en PostgreSQL',
      data: result
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
 * POST /api/products/adjust-stock
 * Ajuste manual de stock, bajas por merma/rotura/vencimiento
 */
async function adjustStock(req, res, next) {
  try {
    const { productId, lotId, adjustmentType, quantity, unitType, reason, userName } = req.body;

    if (!productId || !adjustmentType || quantity === undefined || quantity === null || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros obligatorios: productId, adjustmentType, quantity y motivo (reason) detallado.'
      });
    }

    if (!reason.trim() || reason.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar un motivo o justificación clara del ajuste (mínimo 4 caracteres).'
      });
    }

    const author = userName || (req.user ? req.user.name : 'Administrador');

    const result = await ProductModel.adjustStock({
      productId,
      lotId,
      adjustmentType,
      quantity,
      unitType,
      reason: reason.trim(),
      userName: author
    });

    res.status(200).json({
      success: true,
      message: `Ajuste (${adjustmentType.toUpperCase()}) procesado y registrado en Kardex.`,
      data: result
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
 * GET /api/products/expiring/report
 * Alertas FEFO y Lotes próximos a vencer
 */
async function getExpiringLots(req, res, next) {
  try {
    const lots = await ProductModel.getExpiringReport();

    const summary = {
      expired: lots.filter(l => l.fefoAlert === 'expired').length,
      critical: lots.filter(l => l.fefoAlert === 'critical').length,
      warning: lots.filter(l => l.fefoAlert === 'warning').length,
      safe: lots.filter(l => l.fefoAlert === 'safe').length,
      total: lots.length
    };

    res.status(200).json({
      success: true,
      summary,
      count: lots.length,
      data: lots
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/products/:id/lots
 * Crear nuevo lote para un fármaco existente
 */
async function createProductLot(req, res, next) {
  try {
    const { id } = req.params;
    const { lotNumber, expireDate, stockBoxes, stockBlisters, stockUnits } = req.body;

    if (!lotNumber || !expireDate) {
      return res.status(400).json({
        success: false,
        message: 'El número de lote y la fecha de vencimiento son requeridos.'
      });
    }

    const { newLot, productName } = await ProductModel.createLotWithKardex(id, {
      lotNumber,
      expireDate,
      stockBoxes,
      stockBlisters,
      stockUnits
    });

    res.status(201).json({
      success: true,
      message: `Lote "${lotNumber}" registrado exitosamente para "${productName}".`,
      data: newLot
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
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  addStock,
  adjustStock,
  getExpiringLots,
  createProductLot
};
