export default function MetricCard({ icon, label, value, detail }) {
  return <article className="metric-card"><div className="metric-card__icon">{icon}</div><div><p>{label}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>;
}
