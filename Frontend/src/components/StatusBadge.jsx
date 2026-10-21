const labels = { nueva: 'Nueva', pagada: 'Pagada', enviada: 'Enviada', entregada: 'Entregada', cancelada: 'Cancelada' };
export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{labels[status] || status}</span>;
}
