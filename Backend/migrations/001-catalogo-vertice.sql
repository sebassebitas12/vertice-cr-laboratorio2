-- Aplicar a la base existente; no volver a ejecutar schema.sql sobre ella.
BEGIN;
LOCK TABLE productos, orden_items IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE orden_items ADD COLUMN IF NOT EXISTS producto_nombre TEXT;
ALTER TABLE orden_items ADD COLUMN IF NOT EXISTS categoria TEXT;
UPDATE orden_items oi SET producto_nombre = COALESCE(oi.producto_nombre, p.nombre),
    categoria = COALESCE(oi.categoria, p.categoria)
FROM productos p WHERE oi.producto_id = p.id;
ALTER TABLE orden_items ALTER COLUMN producto_nombre SET NOT NULL;
ALTER TABLE orden_items ALTER COLUMN categoria SET NOT NULL;

-- Archivar únicamente las fichas genéricas conocidas. No se borran filas,
-- órdenes, clientes, cantidades, importes ni usos de cupones.
UPDATE productos SET activo = FALSE WHERE nombre IN (
    'Café de altura', 'Taza artesanal', 'Bolsa reutilizable', 'Miel orgánica',
    'Chocolate oscuro', 'Botella térmica', 'Cuaderno reciclado', 'Vela aromática', 'Termo de acero'
);

-- Datos sintéticos del laboratorio, no oferta comercial aprobada.
INSERT INTO productos (nombre, descripcion, precio, stock, categoria)
SELECT s.* FROM (VALUES
    ('Soporte de celular en PLA', 'Concepto FDM para escritorio. Material propuesto: PLA; requiere revisión del taller.', 6500.00, 12, 'Escritorio'),
    ('Organizador modular en PETG', 'Concepto de bandeja modular FDM. Material propuesto: PETG.', 4800.00, 10, 'Organización'),
    ('Clip para cables en TPU', 'Concepto de clip flexible FDM. Material propuesto: TPU.', 2500.00, 20, 'Organización'),
    ('Maceta geométrica en PLA', 'Concepto decorativo FDM. Material propuesto: PLA.', 5200.00, 8, 'Decoración'),
    ('Perilla de repuesto en ABS', 'Concepto de repuesto FDM; ajuste y uso pendientes de revisión. Material propuesto: ABS.', 3200.00, 10, 'Repuestos'),
    ('Soporte de sensor en ASA', 'Concepto de soporte FDM. Material propuesto: ASA; tolerancias pendientes de validación.', 8900.00, 6, 'Prototipos'),
    ('Separador para herramientas en PETG', 'Concepto de organizador FDM para el taller. Material propuesto: PETG.', 2800.00, 15, 'Taller'),
    ('Prototipo de carcasa en PLA', 'Concepto de carcasa FDM para revisión dimensional. Material propuesto: PLA.', 4100.00, 5, 'Prototipos')
) AS s(nombre, descripcion, precio, stock, categoria)
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.nombre = s.nombre);
COMMIT;
