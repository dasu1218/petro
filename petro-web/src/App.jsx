import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AuthProvider from './context/AuthProvider'
import CartProvider from './context/CartProvider'
import AccountPage from './pages/AccountPage'
import CartPage from './pages/CartPage'
import BundlesPage from './pages/BundlesPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderPage from './pages/OrderPage'
import OrdersPage from './pages/OrdersPage'
import HomePage from './pages/HomePage'
import WellnessPage from './pages/WellnessPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProductDetailPage from './pages/ProductDetailPage'
import RegisterPage from './pages/RegisterPage'
import ShopPage from './pages/ShopPage'
import ProductProvider from './context/ProductProvider'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import WishlistProvider from './context/WishlistProvider'
import WishlistPage from './pages/WishlistPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
          <WishlistProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/bundles" element={<BundlesPage />} />
              <Route path="/wellness" element={<WellnessPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderPage />} />
                <Route path="/account" element={<AccountPage />} /><Route path="/wishlist" element={<WishlistPage />} />
              </Route>
              <Route element={<ProtectedRoute adminOnly />}><Route path="/admin/products" element={<AdminProductsPage />} /><Route path="/admin/orders" element={<AdminOrdersPage />} /></Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </WishlistProvider>
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
