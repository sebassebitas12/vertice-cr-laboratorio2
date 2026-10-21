import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AiAssistant from '../components/AiAssistant';
import ErrorMessage from '../components/ErrorMessage';
import { useCart } from '../context/CartContext';
import { useFetch } from '../hooks/useFetch';
import { createOrder, getClients } from '../services/api';
import { makeOrderPayload } from '../services/orderPayload';

const money = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

export default function OrderPage() {
  const { cart, setQuantity, removeProduct, clearCart, subtotal } = useCart();
  const [clientId, setClientId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const fetchClients = useCallback(() => getClients(), []);
  const { data: clients = [], loading: clientsLoading, error: clientsError } = useFetch(fetchClients, { initialData: [] });

  async function handleSubmit(event) {
    event.preventDefault(); setError(null); setSuccess(null);
    if (!clientId) { setError(new Error('Selecciona un cliente antes de crear la orden')); return; }
    if (!cart.length) { setError(new Error('Agrega al menos un producto al carrito')); return; }
    setSubmitting(true);
    try {
      const order = await createOrder(makeOrderPayload(clientId, cart, coupon));
      setSuccess(order); clearCart();
    } catch (requestError) { setError(requestError); } finally { setSubmitting(false); }
  }

  if (success) return <section className="success-panel"><span className="success-panel__icon">✓</span><span className="eyebrow">Orden creada correctamente</span><h1>¡Gracias por tu compra!</h1><p>La orden <strong>#{success.id}</strong> fue registrada por {money.format(Number(success.total))}.</p><div className="button-row"><Link className="button button--primary" to={`/ordenes/${success.id}`}>Ver detalle</Link><Link className="button button--secondary" to="/">Volver al catálogo</Link></div></section>;

  return <><section className="page-intro"><span className="eyebrow">Checkout</span><h1>Construye tu orden</h1><p>Selecciona el cliente, revisa los productos y confirma la compra.</p></section><ErrorMessage error={error} /><ErrorMessage error={clientsError} /><div className="order-layout"><section className="panel panel--large"><div className="panel__heading"><div><span className="eyebrow">01 · Productos</span><h2>Tu carrito</h2></div><Link className="text-link" to="/">+ Agregar productos</Link></div>{!cart.length ? <div className="empty-state empty-state--small"><span>🛒</span><h3>Tu carrito está vacío</h3><p>Agrega productos desde el catálogo para comenzar.</p><Link className="button button--primary button--small" to="/">Explorar catálogo</Link></div> : <div className="cart-list">{cart.map((item) => <div className="cart-item" key={item.id}><div className="cart-item__icon">{item.categoria?.slice(0, 1).toUpperCase()}</div><div className="cart-item__info"><strong>{item.nombre}</strong><span>{money.format(Number(item.precio))} · {item.stock} disponibles</span></div><input className="quantity-input" type="number" min="1" max={item.stock} value={item.quantity} onChange={(event) => setQuantity(item.id, event.target.value)} aria-label={`Cantidad de ${item.nombre}`} /><strong className="cart-item__total">{money.format(Number(item.precio) * item.quantity)}</strong><button className="icon-button" type="button" onClick={() => removeProduct(item.id)} aria-label={`Quitar ${item.nombre}`}>×</button></div>)}</div>}<AiAssistant type="recomendaciones" cartItems={cart} /></section><form className="panel order-form" onSubmit={handleSubmit}><div className="panel__heading"><div><span className="eyebrow">02 · Datos</span><h2>Confirmar orden</h2></div></div><label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={clientsLoading}><option value="">{clientsLoading ? 'Cargando clientes...' : 'Selecciona un cliente'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre} · {client.ciudad}</option>)}</select></label><label>Cupón de descuento <span className="label-hint">opcional</span><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Ej. VERTICE10" /></label><div className="order-total"><span>Subtotal estimado</span><strong>{money.format(subtotal)}</strong></div><p className="form-note">El envío y el descuento final se calculan en el backend según las reglas del negocio.</p><button className="button button--primary button--wide" type="submit" disabled={submitting || !cart.length}>{submitting ? 'Creando orden...' : 'Confirmar orden →'}</button><button className="button button--secondary button--wide" type="button" onClick={() => navigate('/ordenes')}>Ver historial de órdenes</button></form></div></>;
}
