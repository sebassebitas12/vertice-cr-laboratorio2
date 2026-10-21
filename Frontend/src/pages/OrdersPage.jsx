import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import { useFetch } from '../hooks/useFetch';
import { getOrders } from '../services/api';

const money = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const fetchOrders = useCallback(() => getOrders(status ? { estado: status } : {}), [status]);
  const { data: orders = [], loading, error } = useFetch(fetchOrders, { initialData: [] });
  return <><section className="page-intro page-intro--inline"><div><span className="eyebrow">Operación</span><h1>Historial de órdenes</h1><p>Consulta el estado y el total de cada compra.</p></div><label className="compact-filter"><span>Filtrar estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas</option><option value="nueva">Nuevas</option><option value="pagada">Pagadas</option><option value="enviada">Enviadas</option><option value="entregada">Entregadas</option><option value="cancelada">Canceladas</option></select></label></section><ErrorMessage error={error} />{loading && <LoadingState />}{!loading && !orders.length && <div className="empty-state"><span>▱</span><h3>No hay órdenes para mostrar</h3><p>Las órdenes creadas aparecerán aquí.</p></div>}{!loading && Boolean(orders.length) && <section className="table-card"><div className="table-card__header"><span>{orders.length} {orders.length === 1 ? 'orden encontrada' : 'órdenes encontradas'}</span><Link className="button button--primary button--small" to="/orden/nueva">Nueva orden</Link></div><div className="table-wrap"><table><thead><tr><th>Orden</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="align-right">Total</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.id}</strong></td><td>{order.cliente_nombre}</td><td>{new Date(order.fecha).toLocaleDateString('es-CR')}</td><td><StatusBadge status={order.estado} /></td><td className="align-right"><strong>{money.format(Number(order.total))}</strong></td><td className="align-right"><Link className="table-link" to={`/ordenes/${order.id}`}>Ver detalle →</Link></td></tr>)}</tbody></table></div></section>}</>;
}
