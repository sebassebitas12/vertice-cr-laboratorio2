import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import { useFetch } from '../hooks/useFetch';
import { getOrder, updateOrderStatus } from '../services/api';

const money = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
const transitions = { nueva: ['pagada', 'cancelada'], pagada: ['enviada', 'cancelada'], enviada: ['entregada'], entregada: [], cancelada: [] };

export default function OrderDetailPage() {
  const { id } = useParams();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionError, setActionError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const fetchOrder = useCallback(() => getOrder(id), [id]);
  const { data: order, setData: setOrder, loading, error, reload } = useFetch(fetchOrder, { initialData: null });
  useEffect(() => { if (order) setSelectedStatus(transitions[order.estado]?.[0] || ''); }, [order]);

  async function handleStatusChange(event) {
    event.preventDefault(); if (!selectedStatus) return;
    setUpdating(true); setActionError(null);
    try { setOrder(await updateOrderStatus(id, selectedStatus)); } catch (requestError) { setActionError(requestError); } finally { setUpdating(false); reload(); }
  }

  if (loading) return <LoadingState />;
  return <><Link className="back-link" to="/ordenes">← Volver a órdenes</Link><ErrorMessage error={error || actionError} />{order && <><section className="detail-header"><div><span className="eyebrow">Detalle de orden</span><h1>Orden #{order.id}</h1><p>{new Date(order.fecha).toLocaleString('es-CR')}</p></div><StatusBadge status={order.estado} /></section><div className="detail-grid"><section className="panel panel--large"><div className="panel__heading"><div><span className="eyebrow">Productos</span><h2>Artículos de la orden</h2></div></div><div className="detail-items">{order.items?.map((item) => <div className="detail-item" key={item.id}><div><strong>{item.cantidad} × {item.producto_nombre}</strong><span>{item.categoria} · {money.format(Number(item.precio_unitario))} c/u</span></div><strong>{money.format(Number(item.subtotal_linea))}</strong></div>)}</div>{order.cupon && <div className="coupon-note">✦ Cupón {order.cupon.codigo} aplicado · {order.cupon.porcentaje}% de descuento</div>}</section><aside className="detail-sidebar"><section className="panel"><span className="eyebrow">Cliente</span><h2>{order.cliente?.nombre}</h2><p>{order.cliente?.email}<br />{order.cliente?.ciudad}</p></section><section className="panel"><span className="eyebrow">Resumen</span><div className="summary-list"><span>Subtotal <b>{money.format(Number(order.subtotal))}</b></span><span>Descuento <b className="positive">-{money.format(Number(order.descuento))}</b></span><span>Envío <b>{Number(order.envio) ? money.format(Number(order.envio)) : 'Gratis'}</b></span><strong>Total <b>{money.format(Number(order.total))}</b></strong></div></section><section className="panel"><span className="eyebrow">Actualizar estado</span>{transitions[order.estado]?.length ? <form onSubmit={handleStatusChange}><select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>{transitions[order.estado].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select><button className="button button--primary button--wide" type="submit" disabled={updating}>{updating ? 'Guardando...' : 'Guardar estado'}</button></form> : <p className="form-note">Esta orden ya no tiene transiciones disponibles.</p>}</section></aside></div></>}</>;
}
