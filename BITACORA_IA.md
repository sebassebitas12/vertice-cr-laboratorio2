# Bitácora de Uso de IA - Laboratorio 2

**Estudiante:** Sebastián  
**Proyecto:** Vertice CR - Tienda Online con Inventario, Cupones y Envíos (Caso 5)  
**Herramientas de IA utilizadas:** Antigravity IDE (Gemini / Claude) y Codex

---

## Entrada 1: Sincronización de secuencias identity en PostgreSQL

* **Prompt:**  
  *"Al hacer POST en /api/productos obtengo error 500 duplicate key value violates unique constraint productos_pkey. Los datos iniciales tenían IDs manuales."*
* **Qué devolvió la IA:**  
  Explicó que al insertar filas con `id` explícito en PostgreSQL con columnas `GENERATED ALWAYS/BY DEFAULT AS IDENTITY`, el contador interno de la secuencia no avanza, quedando en 1 mientras existían IDs hasta el 8. Sugirió usar `setval()`.
* **Qué se corrigió / ajustó:**  
  Se agregaron al final de `schema.sql` las sentencias automáticas `SELECT setval(pg_get_serial_sequence('tabla', 'id'), COALESCE((SELECT MAX(id) FROM tabla), 1));` para todas las tablas con clave primaria autoincremental (`productos`, `clientes`, `cupones`, `ordenes`, `orden_items`), garantizando que la base de datos se pueda recrear desde cero sin colisiones de clave primaria.

---

## Entrada 2: Depuración de validaciones 400 y 404 en endpoints REST

* **Prompt:**  
  *"Necesito probar y capturar los flujos de error 400 y 404 en el CRUD de productos cumpliendo el contrato `{ error: 'mensaje' }`."*
* **Qué devolvió la IA:**  
  Endpoints con validaciones estrictas de tipos numéricos y texto no vacío, retornando 400 y 404 estandarizados.
* **Qué se corrigió / ajustó:**  
  Durante las pruebas en Postman se detectó que la petición 404 devolvía un HTML por defecto de Express porque el método estaba configurado erróneamente en `POST /api/productos/9999` en vez de `GET`. Asimismo, una prueba de DELETE devolvió 400 porque la URL copiada incluía un carácter de nueva línea (`\n`). Se corrigieron ambas peticiones en Postman para capturar la respuesta JSON de negocio esperada.

---

## Entrada 3: Integración de `cupon_usos` y regla de uso único por cliente

* **Prompt:**  
  *"Implementar CRUD de clientes y vincularlo con las órdenes y las reglas de cupones para que un cliente no pueda reutilizar un cupón."*
* **Qué devolvió la IA:**  
  Servicio y controlador de clientes con validación de existencia de tarifa por ciudad, además del endpoint `GET /api/ordenes/:id` con JOINs y objetos anidados (`cliente`, `cupon`, `items`).
* **Qué se corrigió / ajustó:**  
  Al revisar `schema.sql`, la orden de ejemplo #1 aplicaba el cupón `BIENVENIDA10` al cliente #1, pero la tabla pivote `cupon_usos` no tenía ese registro. Se detectó la inconsistencia y se agregó la inserción inicial en `schema.sql` y en Supabase (`INSERT INTO cupon_usos (cupon_id, cliente_id) VALUES (1, 1)`), previniendo que el cliente 1 pudiera reutilizar indebidamente ese cupón.

---

## Entrada 4: Creación atómica de órdenes con transacciones (BEGIN/COMMIT/ROLLBACK)

* **Prompt:**  
  *"Implementar POST /api/ordenes con transacción: validar cliente, ciudad, stock con FOR UPDATE, vigencia/usos de cupón, cálculo de envío gratis sobre ₡30,000 y descuento de inventario."*
* **Qué devolvió la IA:**  
  Función transaccional completa usando un cliente dedicado de `pg`, bloqueando registros para prevenir condiciones de carrera y lanzando errores con status 409 ante inconsistencias de negocio.
* **Qué se corrigió / ajustó:**  
  En la prueba de la orden #3, la IA predijo preliminarmente envío gratuito. Sin embargo, al calcular el subtotal (₡31,900) menos el 15% de descuento (₡4,785), el monto neto sujeto a envío fue ₡27,115 (menor al umbral de ₡30,000), cobrándose correctamente los ₡2,500 de flete a Cartago. Se verificó el cálculo exacto del servidor y se documentó el comportamiento esperado de la regla.

---

## Entrada 5: Máquina de estados de órdenes y reposición de inventario

* **Prompt:**  
  *"Crear PATCH /api/ordenes/:id/estado controlando el flujo nueva -> pagada -> enviada -> entregada, y permitir cancelar reponiendo stock solo antes del envío."*
* **Qué devolvió la IA:**  
  Un controlador y servicio con matriz de transiciones permitidas y bloqueo `FOR UPDATE` sobre la orden.
* **Qué se corrigió / ajustó:**  
  Se verificó que la consulta de actualización de stock (`UPDATE productos ... FROM orden_items`) devolviera con exactitud las cantidades de cada item al cancelar la orden #3 (la Botella térmica volvió de 15 a 18 unidades). Se validó además que estados terminales o avanzados no permitan transiciones inválidas (por ejemplo, intentar devolver una orden `pagada` a `nueva` arroja error 409).

---

## Entrada 6: Frontend React, servicios y hook reutilizable

* **Prompt:** *"Construir el frontend React del Caso 5 con React Router, capa `services/api.js`, hook `useFetch`, catálogo con búsqueda/filtros/orden, carrito, historial, dashboard y manejo de errores HTTP."*
* **Qué devolvió la IA:** Arquitectura de páginas y componentes reutilizables conectada a los endpoints existentes, con estados de carga, error y datos.
* **Qué se corrigió / ajustó:** Se mantuvieron los nombres reales de los campos de la API (`cliente_id`, `producto_id`, `ordenes_por_estado`, `ventas_por_categoria`) y se verificó el build de producción con Vite.

## Entrada 7: Agente comercial en n8n

* **Prompt:** *"Crear un workflow n8n con Webhook, AI Agent y Respond to Webhook para generar descripciones comerciales y recomendaciones, usando el contrato `{ ok, data, error }` sin incluir credenciales."*
* **Qué devolvió la IA:** Workflow exportable con webhook `agente-tienda`, nodo de modelo de chat y respuesta JSON normalizada.
* **Qué se corrigió / ajustó:** Se dejaron las credenciales fuera del JSON y la URL del webhook quedó en `VITE_N8N_WEBHOOK_URL` para poder probar n8n localmente.

## Entrada 8: Contextualización FDM y gestión de piezas

- **Solicitud:** enfocar el catálogo del laboratorio en el futuro taller Vértice y completar los formularios de creación y edición.
- **Resultado:** migración transaccional que archiva fichas genéricas, añade piezas FDM sintéticas y conserva órdenes; gestión React con alta, edición y borrado confirmado; export DeepSeek con validación y contrato de error.
- **Ajuste:** se decidió archivar, en lugar de renombrar los productos comprados; cada línea de orden guarda nombre y categoría históricos. Los precios y el stock se etiquetan como práctica, sin prometer fabricación real.
- **Pruebas:** alta y edición comprobadas desde React; smoke HTTP con 400/404/409 y limpieza de la ficha temporal. La instancia local de n8n se observó como `Published`; la ejecución #121 y la #123 terminaron correctamente. La #123 fue invocada desde el botón de descripción del catálogo. El JSON exportado conserva `active: false`, así que se debe comprobar el estado al importarlo.

## Entrada 9: IDs BIGINT al crear órdenes desde React

- **Error observado:** la API devolvió `400: Cada item necesita un producto_id entero positivo` al confirmar una orden desde el carrito.
- **Causa:** `pg` devuelve IDs BIGINT como texto y el formulario transmitía `producto_id` sin convertirlo.
- **Corrección:** convertir `producto_id` con `Number(item.id)` al construir el payload; conservar la validación estricta de enteros en el servidor.
- **Resultado observado:** React creó la orden #4 por ₡8.300; su cancelación devolvió el soporte de celular de 11 a 12 unidades. Se añadió regresión automatizada del payload para IDs de texto y enteros seguros.

## Entrada 10: revisión visual acotada para el catálogo de práctica

- **Solicitud:** mantener coherencia con Vértice sin convertir el laboratorio en un rediseño; evitar ilustraciones decorativas ambiguas y no forzar fotos que no correspondan.
- **Ajuste:** se retiró el dibujo de capas del hero y se conservó una tarjeta tipográfica con “Fabricación aditiva · Una capa sobre otra”, usando la paleta verde y terracota existente. Se mantuvieron fotos de referencia asociadas por pieza y el modo claro/oscuro.
- **Aprendizaje reutilizable:** una revisión breve también debe comprobar si cada recurso visual comunica algo reconocible del producto o la marca; que combine en color no basta. Limitar la revisión a la pantalla modificada mantiene el trabajo proporcionado al laboratorio.
- **Verificación:** catálogo revisado en claro y oscuro con ocho fichas e imágenes de referencia; la descripción IA respondió desde el catálogo y se observaron recomendaciones del carrito en checkout. `npm test` (3 aprobadas), build y smoke HTTP aprobados. Lint sin errores y con 3 advertencias preexistentes.
