const pool = require('../db');

// Envío gratis si el subtotal con descuento supera este monto (colones).
const ENVIO_GRATIS_DESDE = 30000;

// Error de regla de negocio con su código HTTP (400/404/409).
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const redondear = (n) => Math.round(n * 100) / 100;

async function listar({ estado, cliente_id }) {
  const condiciones = [];
  const valores = [];

  if (estado !== undefined) {
    valores.push(estado);
    condiciones.push(`o.estado = $${valores.length}`);
  }
  if (cliente_id !== undefined) {
    valores.push(cliente_id);
    condiciones.push(`o.cliente_id = $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const resultado = await pool.query(
    `SELECT o.id, o.estado, o.fecha, o.subtotal, o.descuento, o.envio, o.total,
            o.cliente_id, c.nombre AS cliente_nombre
     FROM ordenes o
     JOIN clientes c ON c.id = o.cliente_id
     ${where}
     ORDER BY o.fecha DESC`,
    valores,
  );
  return resultado.rows;
}

// Orden con cliente, cupón (si tiene) e items con nombre de producto.
async function obtenerPorId(id) {
  const orden = await pool.query(
    `SELECT o.id, o.estado, o.fecha, o.subtotal, o.descuento, o.envio, o.total,
            json_build_object('id', c.id, 'nombre', c.nombre, 'email', c.email, 'ciudad', c.ciudad) AS cliente,
            CASE WHEN cu.id IS NULL THEN NULL
                 ELSE json_build_object('id', cu.id, 'codigo', cu.codigo, 'porcentaje', cu.porcentaje)
            END AS cupon
     FROM ordenes o
     JOIN clientes c ON c.id = o.cliente_id
     LEFT JOIN cupones cu ON cu.id = o.cupon_id
     WHERE o.id = $1`,
    [id],
  );
  if (!orden.rowCount) return null;

  const items = await pool.query(
    `SELECT oi.id, oi.producto_id, oi.producto_nombre, oi.categoria,
            oi.cantidad, oi.precio_unitario,
            (oi.cantidad * oi.precio_unitario)::NUMERIC(10, 2) AS subtotal_linea
     FROM orden_items oi
     JOIN productos p ON p.id = oi.producto_id
     WHERE oi.orden_id = $1
     ORDER BY oi.id`,
    [id],
  );
  return { ...orden.rows[0], items: items.rows };
}

/**
 * Crea una orden en una sola transacción.
 * items: [{ producto_id, cantidad }], cupon_codigo opcional.
 */
async function crear({ cliente_id, items, cupon_codigo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cliente y tarifa de envío según su ciudad.
    const cliente = await client.query(
      `SELECT c.id, c.ciudad, t.costo AS tarifa
       FROM clientes c LEFT JOIN tarifas_envio t ON t.ciudad = c.ciudad
       WHERE c.id = $1`,
      [cliente_id],
    );
    if (!cliente.rowCount) throw new ErrorNegocio(404, 'Cliente no encontrado');
    if (cliente.rows[0].tarifa === null) {
      throw new ErrorNegocio(409, `No hay tarifa de envío para ${cliente.rows[0].ciudad}`);
    }

    // 2. Productos bloqueados (FOR UPDATE) para que nadie toque el stock mientras tanto.
    const ids = items.map((i) => i.producto_id);
    const productos = await client.query(
      'SELECT id, nombre, categoria, precio, stock, activo FROM productos WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE',
      [ids],
    );
    const porId = new Map(productos.rows.map((p) => [Number(p.id), p]));

    let subtotal = 0;
    for (const item of items) {
      const p = porId.get(item.producto_id);
      if (!p) throw new ErrorNegocio(404, `Producto ${item.producto_id} no encontrado`);
      if (!p.activo) throw new ErrorNegocio(409, `El producto "${p.nombre}" está archivado. Actualiza el carrito.`);
      if (item.cantidad > p.stock) {
        throw new ErrorNegocio(409, `Stock insuficiente para "${p.nombre}": disponible ${p.stock}, pedido ${item.cantidad}`);
      }
      subtotal += Number(p.precio) * item.cantidad;
    }
    subtotal = redondear(subtotal);

    // 3. Cupón: vigente, con usos disponibles y no usado antes por este cliente.
    let cupon = null;
    if (cupon_codigo) {
      const c = await client.query(
        'SELECT id, codigo, porcentaje, vigente_hasta, usos_maximos FROM cupones WHERE codigo = $1 FOR UPDATE',
        [cupon_codigo],
      );
      if (!c.rowCount) throw new ErrorNegocio(404, `Cupón ${cupon_codigo} no existe`);
      cupon = c.rows[0];

      const vigente = await client.query('SELECT $1::date >= CURRENT_DATE AS ok', [cupon.vigente_hasta]);
      if (!vigente.rows[0].ok) throw new ErrorNegocio(409, `El cupón ${cupon.codigo} está vencido`);

      const usos = await client.query('SELECT COUNT(*)::int AS total FROM cupon_usos WHERE cupon_id = $1', [cupon.id]);
      if (usos.rows[0].total >= cupon.usos_maximos) {
        throw new ErrorNegocio(409, `El cupón ${cupon.codigo} alcanzó su límite de usos`);
      }

      const yaUsado = await client.query(
        'SELECT 1 FROM cupon_usos WHERE cupon_id = $1 AND cliente_id = $2',
        [cupon.id, cliente_id],
      );
      if (yaUsado.rowCount) throw new ErrorNegocio(409, `El cliente ya usó el cupón ${cupon.codigo}`);
    }

    // 4. Totales.
    const descuento = cupon ? redondear((subtotal * cupon.porcentaje) / 100) : 0;
    const conDescuento = redondear(subtotal - descuento);
    const envio = conDescuento > ENVIO_GRATIS_DESDE ? 0 : Number(cliente.rows[0].tarifa);
    const total = redondear(conDescuento + envio);

    // 5. Orden, items, stock y uso del cupón.
    const orden = await client.query(
      `INSERT INTO ordenes (cliente_id, cupon_id, subtotal, descuento, envio, total)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [cliente_id, cupon ? cupon.id : null, subtotal, descuento, envio, total],
    );
    const ordenId = orden.rows[0].id;

    for (const item of items) {
      const p = porId.get(item.producto_id);
      await client.query(
        'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario, producto_nombre, categoria) VALUES ($1, $2, $3, $4, $5, $6)',
        [ordenId, item.producto_id, item.cantidad, p.precio, p.nombre, p.categoria],
      );
      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
    }

    if (cupon) {
      await client.query('INSERT INTO cupon_usos (cupon_id, cliente_id) VALUES ($1, $2)', [cupon.id, cliente_id]);
    }

    await client.query('COMMIT');
    return obtenerPorId(ordenId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Transiciones permitidas desde cada estado.
const TRANSICIONES = {
  nueva: ['pagada', 'cancelada'],
  pagada: ['enviada', 'cancelada'],
  enviada: ['entregada'],
  entregada: [],
  cancelada: [],
};

async function cambiarEstado(id, nuevoEstado) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orden = await client.query('SELECT id, estado FROM ordenes WHERE id = $1 FOR UPDATE', [id]);
    if (!orden.rowCount) throw new ErrorNegocio(404, 'Orden no encontrada');

    const actual = orden.rows[0].estado;
    if (!TRANSICIONES[actual].includes(nuevoEstado)) {
      const permitidos = TRANSICIONES[actual].length ? TRANSICIONES[actual].join(', ') : 'ninguno';
      throw new ErrorNegocio(409, `No se puede pasar de "${actual}" a "${nuevoEstado}". Permitidos: ${permitidos}`);
    }

    // Al cancelar se devuelve el stock de cada item.
    if (nuevoEstado === 'cancelada') {
      await client.query(
        `UPDATE productos p
         SET stock = p.stock + oi.cantidad
         FROM orden_items oi
         WHERE oi.orden_id = $1 AND oi.producto_id = p.id`,
        [id],
      );
    }

    await client.query('UPDATE ordenes SET estado = $1 WHERE id = $2', [nuevoEstado, id]);
    await client.query('COMMIT');
    return obtenerPorId(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listar, obtenerPorId, crear, cambiarEstado, ErrorNegocio, ENVIO_GRATIS_DESDE };
