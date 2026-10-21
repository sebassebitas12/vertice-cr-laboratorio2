const productosService = require('../services/productos.service');

function validarId(valor) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

function validarProducto(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return 'Se requiere un objeto de producto';
  if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) return 'El nombre es obligatorio y no puede estar vacío';
  if (datos.precio === undefined || datos.precio === null || datos.precio === '' || !Number.isFinite(Number(datos.precio)) || Number(datos.precio) <= 0) {
    return 'El precio debe ser un número mayor que cero';
  }
  if (datos.stock === undefined || datos.stock === null || datos.stock === '' || !Number.isInteger(Number(datos.stock)) || Number(datos.stock) < 0) {
    return 'El stock debe ser un entero mayor o igual a cero';
  }
  if (typeof datos.categoria !== 'string' || !datos.categoria.trim()) return 'La categoría es obligatoria';
  if (datos.descripcion !== undefined && datos.descripcion !== null && typeof datos.descripcion !== 'string') {
    return 'La descripción debe ser texto';
  }
  return null;
}

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch((error) => {
    console.error('Error en el CRUD de productos:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
}

const listar = asyncHandler(async (req, res) => {
  const { categoria, buscar } = req.query;
  if ((categoria !== undefined && typeof categoria !== 'string') || (buscar !== undefined && typeof buscar !== 'string')) {
    return res.status(400).json({ error: 'Los filtros deben ser texto' });
  }
  const productos = await productosService.listar({ categoria, buscar });
  return res.status(200).json(productos);
});

const obtener = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const producto = await productosService.obtenerPorId(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.status(200).json(producto);
});

const crear = asyncHandler(async (req, res) => {
  const error = validarProducto(req.body);
  if (error) return res.status(400).json({ error });
  const producto = await productosService.crear({
    ...req.body,
    nombre: req.body.nombre.trim(),
    categoria: req.body.categoria.trim(),
  });
  return res.status(201).json(producto);
});

const actualizar = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const error = validarProducto(req.body);
  if (error) return res.status(400).json({ error });
  const producto = await productosService.actualizar(req.params.id, {
    ...req.body,
    nombre: req.body.nombre.trim(),
    categoria: req.body.categoria.trim(),
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.status(200).json(producto);
});

const eliminar = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const resultado = await productosService.eliminar(req.params.id);
  if (!resultado.existe) return res.status(404).json({ error: 'Producto no encontrado' });
  if (resultado.enOrden) return res.status(409).json({ error: 'No se puede borrar: el producto está asociado a una orden' });
  return res.status(200).json({ mensaje: 'Producto eliminado' });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
