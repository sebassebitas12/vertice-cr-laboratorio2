import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import ErrorMessage from '../components/ErrorMessage';
import LoadingState from '../components/LoadingState';

const money = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' });

export default function ProductsPage() {
  const fetchProducts = useCallback(() => getProducts(), []);
  const { data: products, loading, error, reload } = useFetch(fetchProducts, { initialData: [] });
  const { removeProduct } = useCart();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState('');

  async function confirmDelete() {
    if (busy || !pending) return;
    setBusy(true); setActionError(null); setMessage('');
    try {
      await deleteProduct(pending.id);
      removeProduct(pending.id);
      setMessage(`Se eliminó ${pending.nombre}.`);
      setPending(null); reload();
    } catch (failure) { setActionError(failure); }
    finally { setBusy(false); }
  }

  return <>
    <section className="page-intro page-intro--inline">
      <div><span className="eyebrow">Taller · Laboratorio 2</span><h1>Gestión de piezas</h1><p>Crea y edita el catálogo FDM de práctica.</p></div>
      <Link className="button button--primary" to="/productos/nuevo">Nueva pieza</Link>
    </section>
    <p className="demo-notice">Precios y existencias simulados. Esta práctica no confirma fabricación, disponibilidad ni plazos del taller.</p>
    <ErrorMessage error={error || actionError} />
    {message && <p role="status">{message}</p>}
    {pending && <section className="panel delete-confirmation" aria-labelledby="delete-title">
      <h2 id="delete-title">¿Eliminar {pending.nombre}?</h2>
      <p>Si está asociada a una orden, la API bloqueará la eliminación con un error 409.</p>
      <div className="button-row"><button className="button button--danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button className="button button--secondary" onClick={() => { setPending(null); setActionError(null); }} disabled={busy}>Conservar pieza</button></div>
    </section>}
    {loading ? <LoadingState /> : !error && <section className="table-card"><div className="table-wrap"><table>
      <thead><tr><th>Pieza</th><th>Categoría</th><th>Precio demo</th><th>Stock demo</th><th>Acciones</th></tr></thead>
      <tbody>{products.map((product) => <tr key={product.id}><td>{product.nombre}</td><td>{product.categoria}</td><td>{money.format(Number(product.precio))}</td><td>{product.stock}</td><td><div className="button-row"><Link className="button button--secondary button--small" to={`/productos/${product.id}/editar`}>Editar</Link><button className="button button--ghost button--small" disabled={busy} onClick={() => { setPending(product); setActionError(null); setMessage(''); }}>Eliminar</button></div></td></tr>)}</tbody>
    </table>{!products.length && <p className="empty-state">Todavía no hay piezas. Crea la primera.</p>}</div></section>}
  </>;
}
