import { useCallback } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingState from '../components/LoadingState';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { useFetch } from '../hooks/useFetch';
import { getSummary } from '../services/api';

const money = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

export default function DashboardPage() {
  const fetchSummary = useCallback(() => getSummary(), []);
  const { data: summary, loading, error } = useFetch(fetchSummary, { initialData: null });
  if (loading) return <LoadingState label="Calculando métricas..." />;
  const maxSales = Math.max(1, ...(summary?.ventas_por_categoria || []).map((item) => Number(item.ventas)));

  return <><section className="page-intro page-intro--inline"><div><span className="eyebrow">Inteligencia del negocio</span><h1>Panel de métricas</h1><p>Una vista rápida del rendimiento de tu tienda.</p></div><span className="live-indicator"><i /> Datos en vivo</span></section><ErrorMessage error={error} />{summary && <><section className="metric-grid"><MetricCard icon="↗" label="Ventas totales" value={money.format(Number(summary.ventas_totales))} detail="Órdenes no canceladas" /><MetricCard icon="#" label="Órdenes" value={summary.total_ordenes} detail="Compras registradas" /><MetricCard icon="◉" label="Ticket promedio" value={money.format(Number(summary.valor_promedio_orden))} detail="Valor promedio por orden" /></section><div className="dashboard-grid"><section className="panel"><div className="panel__heading"><div><span className="eyebrow">Rendimiento</span><h2>Ventas por categoría</h2></div></div><div className="bar-list">{summary.ventas_por_categoria?.map((row) => <div className="bar-row" key={row.categoria}><div><span>{row.categoria}</span><strong>{money.format(Number(row.ventas))}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(8, Number(row.ventas) / maxSales * 100)}%` }} /></div><small>{row.unidades} unidades</small></div>)}</div></section><section className="panel"><div className="panel__heading"><div><span className="eyebrow">Inventario vendido</span><h2>Top 3 productos</h2></div></div><div className="rank-list">{summary.top_productos?.map((product, index) => <div className="rank-row" key={product.id}><span className="rank-number">0{index + 1}</span><div><strong>{product.nombre}</strong><small>{product.categoria}</small></div><b>{product.unidades_vendidas} uds.</b></div>)}</div></section><section className="panel panel--wide"><div className="panel__heading"><div><span className="eyebrow">Operación</span><h2>Órdenes por estado</h2></div></div><div className="status-grid">{summary.ordenes_por_estado?.map((row) => <div className="status-card" key={row.estado}><StatusBadge status={row.estado} /><strong>{row.cantidad}</strong><span>órdenes</span></div>)}</div></section></div></>}</>;
}
