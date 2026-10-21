export default function ErrorMessage({ error, compact = false }) {
  if (!error) return null;
  const status = error.status ? `Error ${error.status}` : 'Error';
  return <div className={`error-message ${compact ? 'error-message--compact' : ''}`} role="alert"><strong>{status}</strong><span>{error.message || 'Ocurrió un error inesperado'}</span></div>;
}
