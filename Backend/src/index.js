const express = require('express');
const cors = require('cors');
const pool = require('./db');
const productosRoutes = require('./routes/productos.routes');
const clientesRoutes = require('./routes/clientes.routes');
const ordenesRoutes = require('./routes/ordenes.routes');
const resumenRoutes = require('./routes/resumen.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, hora: result.rows[0].now });
  } catch (error) {
    console.error('Error al consultar la base de datos:', error.message);
    res.status(500).json({ error: 'No se pudo conectar con la base de datos' });
  }
});

app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/resumen', resumenRoutes);

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El JSON enviado no es válido' });
  }
  console.error('Error de solicitud:', error.message);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
});
