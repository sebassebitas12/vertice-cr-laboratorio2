const ordenesService = require('../services/ordenes.service');

const ESTADOS = ['nueva', 'pagada', 'enviada', 'entregada', 'cancelada'];

function validarId(valor) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch((error) => {
    if (error instanceof ordenesService.ErrorNegocio) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error en órdenes:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
}

function validarOrden(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return 'Se requiere un objeto de orden';
  if (!Number.isInteger(datos.cliente_id) || datos.cliente_id <= 0) return 'cliente_id debe ser un entero positivo';
  if (!Array.isArray(datos.items) || datos.items.length === 0) return 'La orden debe tener al menos un item';
  const vistos = new Set();
  for (const item of datos.items) {
    if (!item || !Number.isInteger(item.producto_id) || item.producto_id <= 0) {
      return 'Cada item necesita un producto_id entero positivo';
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) return 'La cantidad debe ser un entero mayor que cero';
    if (vistos.has(item.producto_id)) return `El producto ${item.producto_id} está repetido en los items`;
    vistos.add(item.producto_id);
  }
  if (datos.cupon_codigo !== undefined && datos.cupon_codigo !== null
    && (typeof datos.cupon_codigo !== 'string' || !datos.cupon_codigo.trim())) {
    return 'cupon_codigo debe ser texto';
  }
  return null;
}

const listar = asyncHandler(async (req, res) => {
  const { estado, cliente_id } = req.query;
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Use: ${ESTADOS.join(', ')}` });
  }
  if (cliente_id !== undefined && !validarId(cliente_id)) {
    return res.status(400).json({ error: 'cliente_id debe ser un entero positivo' });
  }
  const ordenes = await ordenesService.listar({ estado, cliente_id });
  return res.status(200).json(ordenes);
});

const obtener = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const orden = await ordenesService.obtenerPorId(req.params.id);
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  return res.status(200).json(orden);
});

const crear = asyncHandler(async (req, res) => {
  const error = validarOrden(req.body);
  if (error) return res.status(400).json({ error });
  const orden = await ordenesService.crear({
    cliente_id: req.body.cliente_id,
    items: req.body.items,
    cupon_codigo: req.body.cupon_codigo ? req.body.cupon_codigo.trim().toUpperCase() : null,
  });
  return res.status(201).json(orden);
});

const cambiarEstado = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const estado = req.body && req.body.estado;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Use: ${ESTADOS.join(', ')}` });
  }
  const orden = await ordenesService.cambiarEstado(req.params.id, estado);
  return res.status(200).json(orden);
});

module.exports = { listar, obtener, crear, cambiarEstado };
