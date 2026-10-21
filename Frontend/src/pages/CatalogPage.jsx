import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import { useFetch } from '../hooks/useFetch';
import { getProducts } from '../services/api';
import { useCart } from '../context/CartContext';
import '../catalog.css';

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('nombre');
  const [addedId, setAddedId] = useState(null);
  const { addProduct } = useCart();
  const fetchProducts = useCallback(() => getProducts(), []);
  const { data: products = [], loading, error } = useFetch(fetchProducts, { initialData: [] });
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.categoria))].sort(),
    [products],
  );
  const sortedProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = !category || product.categoria === category;
    const matchesSearch = normalize(product.nombre + ' ' + product.descripcion).includes(normalize(search.trim()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sort === 'precio-asc') return Number(a.precio) - Number(b.precio);
    if (sort === 'precio-desc') return Number(b.precio) - Number(a.precio);
    if (sort === 'stock') return Number(b.stock) - Number(a.stock);
    return a.nombre.localeCompare(b.nombre);
  }), [products, sort, search, category]);

  function handleAdd(product) {
    addProduct(product);
    setAddedId(product.id);
    window.setTimeout(() => setAddedId(null), 1400);
  }

  return (
    <div className="catalog-page">
      <section className="hero-section catalog-hero">
        <div className="catalog-hero__copy">
          <span className="eyebrow">Vértice CR · Laboratorio FDM</span>
          <h1>Diseño que toma forma,<br /><em>capa a capa.</em></h1>
          <p>Explora piezas para organizar, reparar y prototipar. Cada ficha es un punto de partida para aprender impresión 3D.</p>
          <a className="catalog-hero__link" href="#catalogo">Explorar piezas <span aria-hidden="true">↓</span></a>
        </div>
        <aside className="catalog-hero__note" aria-label="Fabricación aditiva">
          <span>FABRICACIÓN ADITIVA</span>
          <strong>Una capa sobre otra.</strong>
        </aside>
      </section>

      <p className="demo-notice">
        Laboratorio 2 · Precios y existencias son datos de práctica. Vértice fabrica bajo pedido; este catálogo no confirma disponibilidad ni plazos.
      </p>

      <section className="section-heading catalog-heading" id="catalogo">
        <div>
          <span className="eyebrow">Piezas de práctica</span>
          <h2>Catálogo FDM</h2>
        </div>
        <div className="button-row">
          <Link className="text-link" to="/productos">Gestionar piezas</Link>
          <Link className="text-link" to="/orden/nueva">Ver carrito <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="filters catalog-filters" aria-label="Filtros de piezas">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar piezas"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar piezas o materiales"
          />
        </label>
        <label>
          <span className="sr-only">Categoría</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Ordenar</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="nombre">Ordenar: nombre</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="stock">Mayor stock demo</option>
          </select>
        </label>
      </section>

      {loading && <LoadingState />}
      <ErrorMessage error={error} />
      {!loading && !error && !sortedProducts.length && (
        <div className="empty-state">
          <h3>No encontramos piezas</h3>
          <p>Prueba con otra búsqueda o elimina los filtros.</p>
        </div>
      )}
      {!loading && !error && (
        <section className="product-grid catalog-grid" aria-label="Piezas disponibles para la práctica">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={handleAdd}
              added={addedId === product.id}
            />
          ))}
        </section>
      )}
    </div>
  );
}
