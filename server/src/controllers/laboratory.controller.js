const { query, get, run } = require('../db');

/**
 * Listar todos los laboratorios con conteo de medicamentos
 */
async function getAllLaboratories(req, res, next) {
  try {
    const labs = await query(`
      SELECT 
        l.id, 
        l.name, 
        COALESCE(l.country, 'Perú') AS country, 
        COALESCE(l.contact, '') AS contact, 
        l.created_at, 
        COUNT(p.id)::int AS "productCount"
      FROM laboratorios l
      LEFT JOIN productos p ON LOWER(l.name) = LOWER(p.laboratory)
      GROUP BY l.id
      ORDER BY l.name ASC;
    `);

    res.status(200).json({
      success: true,
      data: labs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registrar nuevo laboratorio farmacéutico
 */
async function createLaboratory(req, res, next) {
  try {
    const { name, country = 'Perú', contact = '' } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del laboratorio es obligatorio.'
      });
    }

    const cleanName = name.trim();
    const existing = await get('SELECT id FROM laboratorios WHERE LOWER(name) = LOWER($1)', [cleanName]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `El laboratorio "${cleanName}" ya existe en el sistema.`
      });
    }

    const inserted = await get(`
      INSERT INTO laboratorios (name, country, contact)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [cleanName, country.trim(), contact.trim()]);

    res.status(201).json({
      success: true,
      message: `Laboratorio "${inserted.name}" registrado con éxito.`,
      data: inserted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Actualizar laboratorio y propagar cambios de nombre
 */
async function updateLaboratory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, country, contact } = req.body;

    const current = await get('SELECT * FROM laboratorios WHERE id = $1', [id]);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: `Laboratorio #${id} no encontrado.`
      });
    }

    const newName = name ? name.trim() : current.name;
    const newCountry = country !== undefined ? country.trim() : current.country;
    const newContact = contact !== undefined ? contact.trim() : current.contact;

    const updated = await get(`
      UPDATE laboratorios 
      SET name = $1, country = $2, contact = $3
      WHERE id = $4
      RETURNING *;
    `, [newName, newCountry, newContact, id]);

    // Si cambió el nombre, sincronizar en productos
    if (newName !== current.name) {
      await run('UPDATE productos SET laboratory = $1 WHERE LOWER(laboratory) = LOWER($2)', [newName, current.name]);
    }

    res.status(200).json({
      success: true,
      message: 'Laboratorio actualizado correctamente.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Eliminar laboratorio con validación referencial
 */
async function deleteLaboratory(req, res, next) {
  try {
    const { id } = req.params;
    const lab = await get('SELECT * FROM laboratorios WHERE id = $1', [id]);
    if (!lab) {
      return res.status(404).json({
        success: false,
        message: `Laboratorio #${id} no encontrado.`
      });
    }

    const countRow = await get('SELECT COUNT(*)::int AS count FROM productos WHERE LOWER(laboratory) = LOWER($1)', [lab.name]);
    if (countRow && countRow.count > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar "${lab.name}" porque tiene ${countRow.count} medicamentos asociados. Reasigne los productos primero.`
      });
    }

    await run('DELETE FROM laboratorios WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: `Laboratorio "${lab.name}" eliminado correctamente.`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reasignar medicamentos masivamente de un laboratorio a otro
 */
async function reassignLaboratory(req, res, next) {
  try {
    const { sourceLabName, targetLabName } = req.body;
    if (!sourceLabName || !targetLabName || sourceLabName.toLowerCase() === targetLabName.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar un laboratorio de origen y uno de destino diferentes.'
      });
    }

    const count = await get('SELECT COUNT(*)::int AS count FROM productos WHERE LOWER(laboratory) = LOWER($1)', [sourceLabName]);
    await run('UPDATE productos SET laboratory = $1 WHERE LOWER(laboratory) = LOWER($2)', [targetLabName, sourceLabName]);

    res.status(200).json({
      success: true,
      message: `Se reasignaron ${count.count} medicamentos de "${sourceLabName}" hacia "${targetLabName}".`,
      reassignedCount: count.count
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  reassignLaboratory
};
