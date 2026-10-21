const pool = require('../db');

const CAMPOS = 'id, nombre, email, ciudad';

async function listar({ ciudad, buscar }) {
  const condiciones = [];
  const valores = [];

  if (ciudad !== undefined) {
    valores.push(ciudad);
    condiciones.push(`ciudad = $${valores.length}`);
  }
  if (buscar !== undefined) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(nombre ILIKE $${valores.length} OR email ILIKE $${valores.length})`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const resultado = await pool.query(`SELECT ${CAMPOS} FROM clientes ${where} ORDER BY id`, valores);
  return resultado.rows;
}

// Cliente + sus órdenes (dato relacionado).
async function obtenerPorId(id) {
  const cliente = await pool.query(`SELECT ${CAMPOS} FROM clientes WHERE id = $1`, [id]);
  if (!cliente.rowCount) return null;

  const ordenes = await pool.query(
    `SELECT id, estado, fecha, subtotal, descuento, envio, total
     FROM ordenes WHERE cliente_id = $1 ORDER BY fecha DESC`,
    [id],
  );
  return { ...cliente.rows[0], ordenes: ordenes.rows };
}

async function ciudadExiste(ciudad) {
  const resultado = await pool.query('SELECT 1 FROM tarifas_envio WHERE ciudad = $1', [ciudad]);
  return resultado.rowCount > 0;
}

// Devuelve { cliente } o { conflicto: true } si el email ya existe.
async function crear({ nombre, email, ciudad }) {
  try {
    const resultado = await pool.query(
      `INSERT INTO clientes (nombre, email, ciudad) VALUES ($1, $2, $3) RETURNING ${CAMPOS}`,
      [nombre, email, ciudad],
    );
    return { cliente: resultado.rows[0] };
  } catch (error) {
    if (error.code === '23505') return { conflicto: true };
    throw error;
  }
}

async function actualizar(id, { nombre, email, ciudad }) {
  try {
    const resultado = await pool.query(
      `UPDATE clientes SET nombre = $1, email = $2, ciudad = $3 WHERE id = $4 RETURNING ${CAMPOS}`,
      [nombre, email, ciudad, id],
    );
    return { cliente: resultado.rows[0] || null };
  } catch (error) {
    if (error.code === '23505') return { conflicto: true };
    throw error;
  }
}

async function eliminar(id) {
  try {
    const resultado = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING id', [id]);
    return { existe: resultado.rowCount > 0 };
  } catch (error) {
    // 23503: tiene órdenes o usos de cupón asociados.
    if (error.code === '23503') return { existe: true, conRelaciones: true };
    throw error;
  }
}

module.exports = { listar, obtenerPorId, ciudadExiste, crear, actualizar, eliminar };
