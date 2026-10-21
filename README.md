# Laboratorio #2 - Vértice CR (Caso 5: Tienda Online)

Sistema backend para tienda online con control de inventario en tiempo real, cupones de descuento, cálculo de flete por ciudad y panel de métricas con PostgreSQL y Node/Express.

El laboratorio está contextualizado en **Vértice CR, impresión 3D FDM**. Sus ocho
piezas iniciales, precios, existencias y tarifas son datos sintéticos de práctica.
El startup fabricará bajo pedido: el stock académico no acredita disponibilidad
comercial. `Tienda-de-Impresion3D/Pruebas` permanece como referencia histórica.

### Actualizar una base existente al catálogo FDM

No ejecutes `schema.sql` sobre una base ya creada. Desde `Backend/`:

```bash
npm run db:migrate
```

La migración `Backend/migrations/001-catalogo-vertice.sql` añade `productos.activo`,
archiva las nueve fichas genéricas conocidas e inserta las ocho piezas FDM si no
existen. Conserva IDs, clientes, órdenes, stock anterior e importes. Las fichas
archivadas pueden recuperarse cambiando `activo` a `TRUE` en PostgreSQL.
Los nombres y categorías de las líneas de orden se guardan como snapshot; las
ventas anteriores conservan su identidad en historial y métricas. Por ello el
dashboard aún puede mostrar categorías del catálogo anterior.
Para una base nueva, `schema.sql` ya contiene las piezas FDM.

---

## 1. Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    CLIENTES ||--o{ ORDENES : "realiza"
    CLIENTES ||--o{ CUPON_USOS : "registra"
    TARIFAS_ENVIO ||--o{ CLIENTES : "determina tarifa"
    CUPONES ||--o{ ORDENES : "aplica"
    CUPONES ||--o{ CUPON_USOS : "consumido en"
    ORDENES ||--|{ ORDEN_ITEMS : "contiene"
    PRODUCTOS ||--o{ ORDEN_ITEMS : "referenciado en"

    PRODUCTOS {
        bigint id PK
        text nombre
        text descripcion
        numeric precio
        integer stock
        text categoria
    }

    CLIENTES {
        bigint id PK
        text nombre
        text email UK
        text ciudad
    }

    TARIFAS_ENVIO {
        text ciudad PK
        numeric costo
    }

    CUPONES {
        bigint id PK
        text codigo UK
        integer porcentaje
        date vigente_hasta
        integer usos_maximos
    }

    CUPON_USOS {
        bigint cupon_id PK,FK
        bigint cliente_id PK,FK
    }

    ORDENES {
        bigint id PK
        bigint cliente_id FK
        bigint cupon_id FK
        text estado
        timestamptz fecha
        numeric subtotal
        numeric descuento
        numeric envio
        numeric total
    }

    ORDEN_ITEMS {
        bigint id PK
        bigint orden_id FK
        bigint producto_id FK
        integer cantidad
        numeric precio_unitario
    }
```

---

## 2. Requisitos y Cómo Levantar el Backend

### Requisitos previos
- Node.js (v18+)
- Proyecto en Supabase / PostgreSQL con el script `schema.sql` ejecutado.

### Pasos de instalación
1. Entrar a la carpeta del backend:
   ```bash
   cd Backend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   Copiar `.env.example` a `.env` y configurar los valores reales:
   ```ini
   PORT=3000
   DATABASE_URL=postgresql://usuario:password@host:port/database
   ```
4. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   El servidor quedará disponible en `http://localhost:3000`.

---

## 3. Endpoints del Backend

Todos los endpoints que devuelven error siguen el contrato:
```json
{ "error": "Mensaje explicativo del error" }
```

### Healthcheck
| Método | Endpoint | Descripción | Estados |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servidor y hora de BD | 200, 500 |

### Productos (`/api/productos`)
| Método | Endpoint | Parámetros / Body | Descripción | Estados |
|---|---|---|---|---|
| `GET` | `/api/productos` | Query: `?categoria=`, `?buscar=` | Lista productos filtrados | 200, 400 |
| `GET` | `/api/productos/:id` | Param: `id` | Detalle de un producto | 200, 400, 404 |
| `POST` | `/api/productos` | `{ nombre, precio, stock, categoria, descripcion }` | Crea un producto | 201, 400 |
| `PUT` | `/api/productos/:id` | `{ nombre, precio, stock, categoria, descripcion }` | Actualiza un producto | 200, 400, 404 |
| `DELETE` | `/api/productos/:id` | Param: `id` | Elimina producto (bloqueado si está en órdenes) | 200, 400, 404, 409 |

### Clientes (`/api/clientes`)
| Método | Endpoint | Parámetros / Body | Descripción | Estados |
|---|---|---|---|---|
| `GET` | `/api/clientes` | Query: `?ciudad=`, `?buscar=` | Lista clientes | 200, 400 |
| `GET` | `/api/clientes/:id` | Param: `id` | Detalle del cliente con su historial de órdenes | 200, 400, 404 |
| `POST` | `/api/clientes` | `{ nombre, email, ciudad }` | Crea cliente (valida tarifa y email único) | 201, 400, 409 |
| `PUT` | `/api/clientes/:id` | `{ nombre, email, ciudad }` | Actualiza datos de un cliente | 200, 400, 404, 409 |
| `DELETE` | `/api/clientes/:id` | Param: `id` | Elimina cliente (bloqueado si tiene órdenes/cupones) | 200, 400, 404, 409 |

### Órdenes (`/api/ordenes`)
| Método | Endpoint | Body | Descripción | Estados |
|---|---|---|---|---|
| `GET` | `/api/ordenes` | Query: `?estado=`, `?cliente_id=` | Listado general de órdenes | 200, 400 |
| `GET` | `/api/ordenes/:id` | Param: `id` | Detalle con cliente, cupón e items con subtotales | 200, 400, 404 |
| `POST` | `/api/ordenes` | `{ cliente_id, items: [{ producto_id, cantidad }], cupon_codigo? }` | Crea orden transaccional y descuenta stock | 201, 400, 404, 409 |
| `PATCH` | `/api/ordenes/:id/estado` | `{ estado }` | Avanza flujo o cancela reponiendo stock | 200, 400, 404, 409 |

### Métricas / Resumen (`/api/resumen`)
| Método | Endpoint | Descripción | Estados |
|---|---|---|---|
| `GET` | `/api/resumen` | Métricas con SQL (`SUM`, `COUNT`, `AVG`, `GROUP BY`): total de ventas, ticket promedio, ventas por categoría, top 3 productos más vendidos y distribución por estado | 200, 500 |

---

## 4. Reglas de Negocio Implementadas

1. **Control de Inventario Atómico:**
   - No se permite pedir más de la existencia disponible (`409 Conflict`).
   - Al confirmar la compra (`POST /api/ordenes`), la deducción de existencias y la creación de líneas ocurren dentro de una transacción con bloqueo pesimista (`FOR UPDATE`).
2. **Cálculo Dinámico de Envíos:**
   - La tarifa base se obtiene de `tarifas_envio` según la ciudad del cliente.
   - **Envío Gratuito:** Si el subtotal neto con descuento supera los ₡30,000, el costo de envío se fija automáticamente en ₡0.
3. **Restricciones de Cupones:**
   - Debe existir y estar vigente a la fecha actual (`vigente_hasta >= CURRENT_DATE`).
   - El número total de canjes no puede exceder `usos_maximos`.
   - El cliente no puede canjear el mismo cupón más de una vez (registro en `cupon_usos`).
4. **Flujo de Estados de Órdenes:**
   - Secuencia válida: `nueva` → `pagada` → `enviada` → `entregada`.
   - Se permite pasar a `cancelada` **únicamente** desde los estados `nueva` o `pagada`.
   - Toda cancelación devuelve automáticamente al inventario las unidades de cada item asociado dentro de la misma transacción.

---

## 5. Colección y Evidencias de Pruebas

- Colección exportada lista para importar en Postman: [`Lab2.postman_collection.json`](./Lab2.postman_collection.json).
- Capturas de ejecución en la carpeta [`capturas/`](./capturas/):
  - `01-post-producto-400.png` (Error 400: datos inválidos en creación)
  - `02-get-producto-404.png` (Error 404: recurso no encontrado)
  - `03-put-producto-200.png` (Actualización exitosa de producto)
  - `04-delete-producto-409.png` (Error 409: borrado bloqueado por integridad referencial)
  - `05-delete-producto-200.png` (Borrado exitoso de producto)
  - `06-post-cliente-409.png` (Error 409: cliente con email duplicado)
  - `07-get-orden-detalle.png` (GET con datos relacionales completos)
  - `08-post-orden-201.png` (Creación de orden con cupón y cálculo de envío)
  - `09-post-orden-cupon-409.png` (Error 409: reuso no permitido de cupón)
  - `10-post-orden-stock-409.png` (Error 409: stock insuficiente)
  - `11-patch-cancelar-orden.png` (Cancelación de orden)
  - `12-get-producto-stock-repuesto.png` (Verificación de reposición de stock)
  - `13-get-resumen.png` (Métricas agregadas con SQL)

## 6. Frontend e integración con IA (Día 2)

El frontend React está en `Frontend/` y consume toda la API mediante `src/services/api.js`.

### Levantar el frontend

```bash
cd Frontend
npm install
copy .env.example .env
npm run dev
```

Vistas implementadas:

- Catálogo con búsqueda, categoría, ordenamiento, carrito y cambio entre tema claro y oscuro.
- Fotos de referencia asociadas a las piezas para esta práctica; no representan disponibilidad ni oferta comercial.
- Nueva orden con cliente, cupón y manejo visual de errores 400/404/409.
- Historial y detalle de órdenes con cambio de estado.
- Dashboard conectado a `/api/resumen`.
- Gestión de piezas en `/productos`, creación en `/productos/nuevo` y edición
  en `/productos/:id/editar`, con borrado confirmado y errores del servidor.

### Agente n8n

El workflow importable está en `n8n/workflow-agente-tienda.json` y contiene Webhook,
validación de entrada, AI Agent, DeepSeek Chat Model y Respond to Webhook.

1. Importar el JSON en n8n.
2. Configurar la credencial del nodo `DeepSeek Chat Model`.
3. Activar el workflow y copiar la URL del webhook en `Frontend/.env`:

```ini
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/agente-tienda
```

El frontend envía `{ tipo: "descripcion", producto }` o
`{ tipo: "recomendaciones", carrito, catalogo }`. El catálogo activo se consulta
antes de pedir recomendaciones para limitar las sugerencias a piezas existentes.
La respuesta esperada es `{ ok, data: { texto }, error: null }` o
`{ ok: false, data: null, error: "mensaje" }` con HTTP 400/502.
El export actualizado requiere importación y publicación en n8n; cambiar el JSON
local no actualiza automáticamente el workflow que ya estaba publicado.
En la instancia local revisada el workflow aparece como `Published`. La ejecución
#123, disparada desde el botón de descripción del catálogo, terminó correctamente.
El JSON del repositorio indica `active: false`; al
importarlo, verifica su estado en n8n en vez de asumir que ya quedó publicado.

### Verificación

Última verificación local (21/10/2026): backend smoke aprobado y ficha temporal
eliminada; frontend `npm test` con 3 aprobadas y `npm run build` aprobado. El lint
terminó sin errores y dejó 3 advertencias existentes en `useFetch`, `CartContext`
y `OrderDetailPage`.

```bash
cd Backend
npm run test:smoke
```

Comprueba CRUD con una ficha temporal, errores 400/404/409, rollback de stock,
protección de referencias y contrato de métricas; al terminar elimina únicamente
la ficha que creó. En `Frontend/`, ejecutar `npm run lint` y `npm run build`.
`npm test` en `Frontend/` verifica el contrato del payload de órdenes, incluidos
IDs BIGINT recibidos como texto y cantidades inválidas.
La gestión del laboratorio es local y no incluye autenticación Admin: no publicar
esta API como sistema de producción.

