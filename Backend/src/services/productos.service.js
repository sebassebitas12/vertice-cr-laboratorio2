const pool = require('../db');

async function listar({ categoria, buscar }) {
  const condiciones = ['activo = TRUE'];
  const valores = [];

  if (categoria !== undefined) {
    valores.push(categoria);
    condiciones.push(`categoria = $${valores.length}`);
  }
  if (buscar !== undefined) {
    valores.push(`%${buscar}%`);
    condiciones.push(`nombre ILIKE $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const resultado = await pool.query(
    `SELECT id, nombre, descripcion, precio, stock, categoria FROM productos ${where} ORDER BY id`,
    valores,
  );
  return resultado.rows;
}

async function obtenerPorId(id) {
  const resultado = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock, categoria FROM productos WHERE id = $1',
    [id],
  );
  return resultado.rows[0] || null;
}

async function crear({ nombre, descripcion = null, precio, stock, categoria }) {
  const resultado = await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio, stock, categoria)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, descripcion, precio, stock, categoria`,
    [nombre, descripcion, precio, stock, categoria],
  );
  return resultado.rows[0];
}

async function actualizar(id, { nombre, descripcion = null, precio, stock, categoria }) {
  const resultado = await pool.query(
    `UPDATE productos
     SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria = $5
     WHERE id = $6
     RETURNING id, nombre, descripcion, precio, stock, categoria`,
    [nombre, descripcion, precio, stock, categoria, id],
  );
  return resultado.rows[0] || null;
}

async function eliminar(id) {
  try {
    const resultado = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING id', [id]);
    if (!resultado.rowCount) return { eliminado: false, existe: false };
    return { eliminado: true, existe: true };
  } catch (error) {
    if (error.code === '23503') return { eliminado: false, existe: true, enOrden: true };
    throw error;
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
