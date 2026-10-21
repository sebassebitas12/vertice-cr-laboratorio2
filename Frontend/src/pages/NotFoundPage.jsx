import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <section className="empty-state"><span>404</span><h1>Página no encontrada</h1><p>La ruta que buscas no existe.</p><Link className="button button--primary" to="/">Volver al catálogo</Link></section>;
}
