const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

export class ApiError extends Error {
  constructor(message, status = 0, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'Respuesta inválida del servidor' }; }
  if (!response.ok) throw new ApiError(data?.error || 'La solicitud no pudo completarse', response.status, data);
  return data;
}

function queryParams(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const getProducts = (filters = {}) => request(`/productos${queryParams(filters)}`);
export const getProduct = (id) => request(`/productos/${id}`);
export const getClients = (filters = {}) => request(`/clientes${queryParams(filters)}`);
export const getClient = (id) => request(`/clientes/${id}`);
export const getOrders = (filters = {}) => request(`/ordenes${queryParams(filters)}`);
export const getOrder = (id) => request(`/ordenes/${id}`);
export const getSummary = () => request('/resumen');
export const createProduct = (product) => request('/productos', { method: 'POST', body: JSON.stringify(product) });
export const updateProduct = (id, product) => request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(product) });
export const deleteProduct = (id) => request(`/productos/${id}`, { method: 'DELETE' });

export const createOrder = (payload) => request('/ordenes', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const updateOrderStatus = (id, estado) => request(`/ordenes/${id}/estado`, {
  method: 'PATCH',
  body: JSON.stringify({ estado }),
});

export async function callAiAgent(payload) {
  if (!N8N_WEBHOOK_URL) throw new ApiError('Configura VITE_N8N_WEBHOOK_URL para usar el agente de IA');
  let response;
  try {
    response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('No se pudo conectar con n8n. Verifica que esté encendido y accesible.');
  }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { throw new ApiError('n8n devolvió una respuesta que no es JSON', response.status); }
  if (!response.ok || data?.ok === false) throw new ApiError(typeof data?.error === 'string' ? data.error : 'El agente de IA no pudo responder', response.status, data);
  if (data?.ok !== true || data.data == null || data.error !== null) throw new ApiError('n8n no devolvió el contrato { ok, data, error } esperado', response.status);
  return data;
}
