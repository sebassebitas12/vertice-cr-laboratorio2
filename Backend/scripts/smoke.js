// Pruebas HTTP contra la API local. Solo elimina la ficha temporal creada aquí.
const assert = require('node:assert/strict');
const BASE = 'http://localhost:3000/api';
async function request(path, method = 'GET', body) {
  const response = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
async function main() {
  let temporaryId;
  const check = (value, message) => { assert.ok(value, message); console.log('OK:', message); };
  try {
    const products = await request('/productos');
    check(products.status === 200 && products.body.length >= 8, 'Catálogo activo disponible');
    check(!products.body.some((p) => ['Botella térmica', 'Café de altura', 'Termo de acero'].includes(p.nombre)), 'Catálogo genérico archivado');
    const invalid = await request('/productos', 'POST', { nombre: 'QA inválida' });
    check(invalid.status === 400, 'Producto inválido devuelve 400');
    const created = await request('/productos', 'POST', { nombre: 'QA TEMPORAL FDM ' + Date.now(), categoria: 'Taller', descripcion: 'Prueba desechable', precio: 1000, stock: 2 });
    check(created.status === 201, 'Crear pieza devuelve 201');
    temporaryId = created.body.id;
    const edited = await request(`/productos/${temporaryId}`, 'PUT', { ...created.body, precio: 1250 });
    check(edited.status === 200 && Number(edited.body.precio) === 1250, 'Editar pieza persiste el precio');
    const clients = await request('/clientes');
    check(clients.status === 200 && clients.body.length > 0, 'Clientes disponibles para orden');
    const clientId = Number(clients.body[0].id);
    const stockConflict = await request('/ordenes', 'POST', { cliente_id: clientId, items: [{ producto_id: Number(temporaryId), cantidad: 3 }] });
    check(stockConflict.status === 409, 'Stock insuficiente devuelve 409');
    const unchanged = await request(`/productos/${temporaryId}`);
    check(unchanged.body.stock === 2, 'Rollback conserva stock tras el conflicto');
    const invalidOrder = await request('/ordenes', 'POST', { cliente_id: clientId, items: [{ producto_id: Number(temporaryId), cantidad: 0 }] });
    check(invalidOrder.status === 400, 'Cantidad inválida devuelve 400');
    const notFound = await request('/productos/9007199254740991');
    check(notFound.status === 404, 'Producto inexistente devuelve 404');
    const orders = await request('/ordenes');
    if (orders.body.length) {
      const detail = await request(`/ordenes/${orders.body[0].id}`);
      const historicalId = detail.body.items[0].producto_id;
      const blocked = await request(`/productos/${historicalId}`, 'DELETE');
      check(blocked.status === 409, 'Historial protege el borrado de piezas referenciadas');
    }
    const summary = await request('/resumen');
    check(summary.status === 200 && Array.isArray(summary.body.ventas_por_categoria), 'Dashboard conserva contrato de métricas');
  } finally {
    if (temporaryId) {
      const removed = await request(`/productos/${temporaryId}`, 'DELETE');
      assert.equal(removed.status, 200, 'Limpieza de pieza temporal');
      assert.equal((await request(`/productos/${temporaryId}`)).status, 404);
      console.log('OK: eliminación y limpieza de la ficha temporal');
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
