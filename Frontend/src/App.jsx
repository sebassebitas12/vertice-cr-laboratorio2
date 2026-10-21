import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import CatalogPage from './pages/CatalogPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderPage from './pages/OrderPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import { CartProvider } from './context/CartContext';

export default function App() {
  return <BrowserRouter><CartProvider><Routes><Route element={<AppLayout />}><Route index element={<CatalogPage />} /><Route path="productos" element={<ProductsPage />} /><Route path="productos/nuevo" element={<ProductFormPage />} /><Route path="productos/:id/editar" element={<ProductFormPage />} /><Route path="orden/nueva" element={<OrderPage />} /><Route path="ordenes" element={<OrdersPage />} /><Route path="ordenes/:id" element={<OrderDetailPage />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></CartProvider></BrowserRouter>;
}
