import { useState } from 'react';
import { callAiAgent, getProducts } from '../services/api';
import ErrorMessage from './ErrorMessage';

function resultText(response) {
  const data = response?.data;
  if (typeof data === 'string') return data;
  return data?.texto || data?.output || data?.respuesta || JSON.stringify(data, null, 2);
}

export default function AiAssistant({ type, product, cartItems = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState('');
  const isDescription = type === 'descripcion';
  const title = isDescription ? 'Descripción con IA' : 'Recomendaciones para tu carrito';

  async function handleGenerate() {
    if (loading) return;
    setLoading(true); setError(null); setResult('');
    try {
      const catalog = isDescription ? [] : await getProducts();
      const payload = isDescription
        ? { tipo: 'descripcion', producto: { nombre: product.nombre, categoria: product.categoria, descripcion: product.descripcion } }
        : { tipo: 'recomendaciones', carrito: cartItems.map((item) => ({ id: item.id, nombre: item.nombre, categoria: item.categoria, cantidad: item.quantity })), catalogo: catalog.map((item) => ({ id: item.id, nombre: item.nombre, categoria: item.categoria, descripcion: item.descripcion })) };
      setResult(resultText(await callAiAgent(payload)));
    } catch (requestError) { setError(requestError); } finally { setLoading(false); }
  }

  return <div className="ai-assistant"><div className="ai-assistant__header"><span>✦</span><span>{title}</span></div><button className="button button--ghost button--small" type="button" onClick={handleGenerate} disabled={loading || (!isDescription && !cartItems.length)}>{loading ? 'Consultando...' : isDescription ? 'Generar texto' : 'Sugerir productos'}</button><ErrorMessage error={error} compact />{result && <p className="ai-assistant__result">{result}</p>}</div>;
}
