const pool = require('../db');

// Las órdenes canceladas no cuentan como venta.
async function obtener() {
  const [generales, porCategoria, topProductos, porEstado] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_ordenes,
              COALESCE(SUM(total), 0)::NUMERIC(12, 2) AS ventas_totales,
              COALESCE(ROUND(AVG(total), 2), 0)::NUMERIC(12, 2) AS valor_promedio_orden
       FROM ordenes
       WHERE estado <> 'cancelada'`,
    ),
    pool.query(
      `SELECT oi.categoria,
              SUM(oi.cantidad)::int AS unidades,
              SUM(oi.cantidad * oi.precio_unitario)::NUMERIC(12, 2) AS ventas
       FROM orden_items oi
       JOIN ordenes o ON o.id = oi.orden_id
       JOIN productos p ON p.id = oi.producto_id
       WHERE o.estado <> 'cancelada'
       GROUP BY oi.categoria
       ORDER BY ventas DESC`,
    ),
    pool.query(
      `SELECT oi.producto_id AS id, oi.producto_nombre AS nombre, oi.categoria,
              SUM(oi.cantidad)::int AS unidades_vendidas
       FROM orden_items oi
       JOIN ordenes o ON o.id = oi.orden_id
       JOIN productos p ON p.id = oi.producto_id
       WHERE o.estado <> 'cancelada'
       GROUP BY oi.producto_id, oi.producto_nombre, oi.categoria
       ORDER BY unidades_vendidas DESC, oi.producto_nombre
       LIMIT 3`,
    ),
    pool.query(
      `SELECT estado, COUNT(*)::int AS cantidad
       FROM ordenes
       GROUP BY estado
       ORDER BY cantidad DESC`,
    ),
  ]);

  return {
    ...generales.rows[0],
    ventas_por_categoria: porCategoria.rows,
    top_productos: topProductos.rows,
    ordenes_por_estado: porEstado.rows,
  };
}

module.exports = { obtener };
