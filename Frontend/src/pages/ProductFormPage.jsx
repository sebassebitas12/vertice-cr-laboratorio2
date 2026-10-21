import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProduct, getProduct, updateProduct } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import ErrorMessage from '../components/ErrorMessage';
import LoadingState from '../components/LoadingState';

function ProductForm({ product }) {
  const navigate = useNavigate();
  const { syncProduct } = useCart();
  const [fields, setFields] = useState(() => product || { nombre: '', descripcion: '', precio: '', stock: '', categoria: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const change = (event) => setFields((value) => ({ ...value, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const data = { nombre: fields.nombre.trim(), descripcion: (fields.descripcion || '').trim(), categoria: fields.categoria.trim(), precio: Number(fields.precio), stock: Number(fields.stock) };
    if (!data.nombre || !data.categoria || !Number.isFinite(data.precio) || data.precio <= 0 || fields.stock === '' || !Number.isInteger(data.stock) || data.stock < 0) {
      setError(new Error('Completa nombre y categoría, un precio positivo y stock entero mayor o igual a cero.')); return;
    }
    setSaving(true); setError(null);
    try {
      const saved = product ? await updateProduct(product.id, data) : await createProduct(data);
      syncProduct(saved);
      navigate('/productos', { state: { savedId: saved.id } });
    } catch (failure) { setError(failure); }
    finally { setSaving(false); }
  }

  return <form className="panel product-form" onSubmit={submit}>
    <ErrorMessage error={error} />
    <label>Nombre de la pieza<input name="nombre" value={fields.nombre} onChange={change} required maxLength={160} placeholder="Ej. Soporte para cámara en PETG" /></label>
    <label>Categoría<input name="categoria" value={fields.categoria} onChange={change} required list="product-categories" placeholder="Ej. Prototipos" /></label>
    <datalist id="product-categories">{['Escritorio', 'Organización', 'Decoración', 'Repuestos', 'Prototipos', 'Taller'].map((category) => <option key={category} value={category} />)}</datalist>
    <label className="product-form__wide">Descripción<textarea name="descripcion" value={fields.descripcion || ''} onChange={change} rows={4} placeholder="Uso propuesto y material FDM. Evita prometer resistencia, tolerancias o plazos sin validar." /></label>
    <label>Precio de práctica (CRC)<input name="precio" type="number" min="0.01" step="0.01" value={fields.precio} onChange={change} required /></label>
    <label>Stock simulado<input name="stock" type="number" min="0" step="1" value={fields.stock} onChange={change} required /></label>
    <p className="form-note product-form__wide">Materiales del taller: PLA, PETG, ABS, ASA y TPU. Los valores de esta práctica no son tarifas oficiales.</p>
    <div className="button-row product-form__wide"><button className="button button--primary" disabled={saving}>{saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear pieza'}</button><Link className="button button--secondary" to="/productos">Cancelar</Link></div>
  </form>;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const fetchProduct = useCallback(() => getProduct(id), [id]);
  const { data, loading, error } = useFetch(fetchProduct, { enabled: Boolean(id) });
  return <>
    <Link className="back-link" to="/productos">← Volver a gestión</Link>
    <section className="page-intro"><span className="eyebrow">Catálogo FDM</span><h1>{id ? 'Editar pieza' : 'Nueva pieza'}</h1></section>
    <ErrorMessage error={error} />
    {id && loading ? <LoadingState /> : !error && (!id || data) && <ProductForm key={id || 'new'} product={id ? data : null} />}
  </>;
}
