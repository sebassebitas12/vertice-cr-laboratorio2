const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/db');

async function main() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/001-catalogo-vertice.sql'), 'utf8');
    await client.query(sql);
    const { rows } = await client.query('SELECT activo, COUNT(*)::int AS cantidad FROM productos GROUP BY activo');
    console.log('Catálogo Vértice migrado. Historial conservado:', rows);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => { console.error('Migración fallida:', error.message); process.exitCode = 1; });
