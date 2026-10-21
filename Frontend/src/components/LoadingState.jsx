export default function LoadingState({ label = 'Cargando información...' }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>;
}
