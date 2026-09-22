const { query, get, run } = require('../db');

/**
 * Listar todas las categorías con conteo de medicamentos asociados
 */
async function getAllCategories(req, res, next) {
  try {
    const categories = await query(`
      SELECT 
        c.id, 
        c.slug, 
        c.name, 
        COALESCE(c.icon, 'bi-tag') AS icon, 
        c.created_at, 
        COUNT(p.id)::int AS "productCount"
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.id ASC;
    `);

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Crear nueva categoría
 */
async function createCategory(req, res, next) {
  try {
    const { name, slug, icon } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio.'
      });
    }

    const cleanName = name.trim();
    const cleanSlug = (slug && slug.trim() !== '')
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      : cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const existing = await get('SELECT id FROM categorias WHERE slug = $1 OR LOWER(name) = LOWER($2)', [cleanSlug, cleanName]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `La categoría "${cleanName}" ya se encuentra registrada.`
      });
    }

    const inserted = await get(`
      INSERT INTO categorias (slug, name, icon)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [cleanSlug, cleanName, icon ? icon.trim() : 'bi-capsule']);

    res.status(201).json({
      success: true,
      message: `Categoría "${inserted.name}" creada exitosamente.`,
      data: inserted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar categoría existente
 */
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;

    const cat = await get('SELECT * FROM categorias WHERE id = $1', [id]);
    if (!cat) {
      return res.status(404).json({
        success: false,
        message: `Categoría #${id} no encontrada.`
      });
    }

    const cleanName = name ? name.trim() : cat.name;
    const cleanIcon = icon ? icon.trim() : cat.icon;

    const updated = await get(`
      UPDATE categorias 
      SET name = $1, icon = $2
      WHERE id = $3
      RETURNING *;
    `, [cleanName, cleanIcon, id]);

    res.status(200).json({
      success: true,
      message: `Categoría actualizada correctamente.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar categoría con validación estricta de productos asociados
 */
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const countRow = await get('SELECT COUNT(*)::int AS count FROM productos WHERE category_id = $1', [id]);
    
    if (countRow && countRow.count > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${countRow.count} medicamentos asignados. Reasigne los productos antes de eliminar.`
      });
    }

    await run('DELETE FROM categorias WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Categoría eliminada correctamente.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reasignar productos masivamente de una categoría a otra
 */
async function reassignCategory(req, res, next) {
  try {
    const { sourceCategoryId, targetCategoryId } = req.body;
    if (!sourceCategoryId || !targetCategoryId || sourceCategoryId == targetCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar una categoría de origen y una categoría de destino distintas.'
      });
    }

    const count = await get('SELECT COUNT(*)::int AS count FROM productos WHERE category_id = $1', [sourceCategoryId]);
    await run('UPDATE productos SET category_id = $1 WHERE category_id = $2', [targetCategoryId, sourceCategoryId]);

    res.status(200).json({
      success: true,
      message: `Se reasignaron exitosamente ${count.count} medicamentos a la nueva categoría.`,
      reassignedCount: count.count
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategory
};
