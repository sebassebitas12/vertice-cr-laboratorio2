import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProducts } from '../services/api';

const CartContext = createContext(null);
const STORAGE_KEY = 'vertice-cr-cart';

function readCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isFinite(Number(item.precio))) : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readCart);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    let active = true;
    getProducts().then((products) => {
      if (!active) return;
      setCart((current) => current.flatMap((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.id));
        return product && product.stock > 0 ? [{ ...product, quantity: Math.min(item.quantity, product.stock) }] : [];
      }));
    }).catch(() => { /* Conservar el carrito si la API no está disponible. */ });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => {
    const addProduct = (product) => setCart((current) => {
      if (product.stock <= 0) return current;
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    const setQuantity = (id, quantity) => setCart((current) => current
      .map((item) => item.id === id
        ? { ...item, quantity: Math.max(0, Math.min(Number(quantity) || 0, item.stock)) } : item)
      .filter((item) => item.quantity > 0));
    const removeProduct = (id) => setCart((current) => current.filter((item) => item.id !== id));
    const clearCart = () => setCart([]);
    const syncProduct = (product) => setCart((current) => current.flatMap((item) => String(item.id) !== String(product.id) ? [item] : product.stock > 0 ? [{ ...product, quantity: Math.min(item.quantity, product.stock) }] : []));
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.precio) * item.quantity, 0);
    return { cart, addProduct, setQuantity, removeProduct, clearCart, syncProduct, totalItems, subtotal };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}
