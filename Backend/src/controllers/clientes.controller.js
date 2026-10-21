const clientesService = require('../services/clientes.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarId(valor) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

function validarCliente(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return 'Se requiere un objeto de cliente';
  if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) return 'El nombre es obligatorio y no puede estar vacío';
  if (typeof datos.email !== 'string' || !EMAIL_REGEX.test(datos.email.trim())) return 'El email no es válido';
  if (typeof datos.ciudad !== 'string' || !datos.ciudad.trim()) return 'La ciudad es obligatoria';
  return null;
}

function limpiar(datos) {
  return {
    nombre: datos.nombre.trim(),
    email: datos.email.trim().toLowerCase(),
    ciudad: datos.ciudad.trim(),
  };
}

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch((error) => {
    console.error('Error en el CRUD de clientes:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
}

const listar = asyncHandler(async (req, res) => {
  const { ciudad, buscar } = req.query;
  if ((ciudad !== undefined && typeof ciudad !== 'string') || (buscar !== undefined && typeof buscar !== 'string')) {
    return res.status(400).json({ error: 'Los filtros deben ser texto' });
  }
  const clientes = await clientesService.listar({ ciudad, buscar });
  return res.status(200).json(clientes);
});

const obtener = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const cliente = await clientesService.obtenerPorId(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.status(200).json(cliente);
});

const crear = asyncHandler(async (req, res) => {
  const error = validarCliente(req.body);
  if (error) return res.status(400).json({ error });
  const datos = limpiar(req.body);

  if (!(await clientesService.ciudadExiste(datos.ciudad))) {
    return res.status(400).json({ error: `No hay tarifa de envío para la ciudad "${datos.ciudad}"` });
  }

  const resultado = await clientesService.crear(datos);
  if (resultado.conflicto) return res.status(409).json({ error: 'Ya existe un cliente con ese email' });
  return res.status(201).json(resultado.cliente);
});

const actualizar = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const error = validarCliente(req.body);
  if (error) return res.status(400).json({ error });
  const datos = limpiar(req.body);

  if (!(await clientesService.ciudadExiste(datos.ciudad))) {
    return res.status(400).json({ error: `No hay tarifa de envío para la ciudad "${datos.ciudad}"` });
  }

  const resultado = await clientesService.actualizar(req.params.id, datos);
  if (resultado.conflicto) return res.status(409).json({ error: 'Ya existe un cliente con ese email' });
  if (!resultado.cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.status(200).json(resultado.cliente);
});

const eliminar = asyncHandler(async (req, res) => {
  if (!validarId(req.params.id)) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
  const resultado = await clientesService.eliminar(req.params.id);
  if (!resultado.existe) return res.status(404).json({ error: 'Cliente no encontrado' });
  if (resultado.conRelaciones) {
    return res.status(409).json({ error: 'No se puede borrar: el cliente tiene órdenes o cupones usados' });
  }
  return res.status(200).json({ mensaje: 'Cliente eliminado' });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
