const resumenService = require('../services/resumen.service');

async function obtener(_req, res) {
  try {
    const resumen = await resumenService.obtener();
    return res.status(200).json(resumen);
  } catch (error) {
    console.error('Error en resumen:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { obtener };
