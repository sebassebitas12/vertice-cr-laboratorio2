// pg devuelve BIGINT como texto; la API del laboratorio valida enteros seguros.
export function makeOrderPayload(clientId, cart, coupon = '') {
  const cliente_id = Number(clientId);
  const items = cart.map((item) => ({ producto_id: Number(item.id), cantidad: Number(item.quantity) }));
  if (!Number.isSafeInteger(cliente_id) || cliente_id <= 0 || !items.length || items.some((item) => !Number.isSafeInteger(item.producto_id) || item.producto_id <= 0 || !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0)) {
    throw new Error('Selecciona un cliente válido y piezas con cantidades enteras positivas.');
  }
  return { cliente_id, items, ...(coupon.trim() ? { cupon_codigo: coupon.trim().toUpperCase() } : {}) };
}
