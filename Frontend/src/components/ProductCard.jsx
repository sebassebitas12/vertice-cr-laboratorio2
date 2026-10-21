import AiAssistant from './AiAssistant';

const money = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

const productImages = [
  { match: /clip|cable/, src: '/images/practica/clip-cables.jpg', alt: 'Clips impresos en 3D para organizar cables' },
  { match: /maceta/, src: '/images/practica/maceta.jpg', alt: 'Maceta geométrica impresa en 3D' },
  { match: /organizador/, src: '/images/practica/organizador.jpg', alt: 'Organizador modular impreso en 3D' },
  { match: /perilla/, src: '/images/practica/Perilla.jpg', alt: 'Perilla de repuesto, imagen de referencia' },
  { match: /separador/, src: '/images/practica/Separador.jpg', alt: 'Separador impreso para organizar herramientas' },
  { match: /soporte de sensor/, src: '/images/practica/soporte.jpg', alt: 'Soporte impreso para sensor, imagen de referencia' },
  { match: /carcasa/, src: '/images/practica/carcasa.jpg', alt: 'Carcasa impresa en 3D para electrónica' },
  { match: /soporte de celular/, src: '/images/practica/soporte-celular.jpg', alt: 'Soporte impreso en 3D para teléfono celular' },
];

function findProductImage(name) {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return productImages.find(({ match }) => match.test(normalizedName));
}

export default function ProductCard({ product, onAdd, added }) {
  const stockClass = product.stock <= 3
    ? 'product-card__stock product-card__stock--low'
    : 'product-card__stock';
  const image = findProductImage(product.nombre);

  return (
    <article className="product-card catalog-product-card">
      <div className="product-card__visual catalog-product-card__visual">
        {image ? (
          <>
            <img
              className="catalog-product-card__image"
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
            />
            <span className="catalog-product-card__image-caption">Imagen de referencia</span>
          </>
        ) : (
          <div className="catalog-product-card__placeholder">
            <span aria-hidden="true">◇</span>
            <small>Foto de referencia pendiente</small>
          </div>
        )}
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="eyebrow">{product.categoria}</span>
          <span className={stockClass}>Stock demo: {product.stock}</span>
        </div>
        <h3>{product.nombre}</h3>
        <p>{product.descripcion || 'Concepto FDM pendiente de revisión del taller.'}</p>
        <div className="product-card__footer">
          <div>
            <small className="price-demo-label">Precio de práctica</small>
            <strong>{money.format(Number(product.precio))}</strong>
          </div>
          <button
            className="button button--primary button--small"
            type="button"
            onClick={() => onAdd(product)}
            disabled={!product.stock}
          >
            {added ? 'Agregado ✓' : product.stock ? 'Agregar' : 'Sin stock demo'}
          </button>
        </div>
        <AiAssistant type="descripcion" product={product} />
      </div>
    </article>
  );
}
