import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import CartDrawer from './CartDrawer'
import PageMetadata from './PageMetadata'
import RouteFocus from './RouteFocus'
import { useAuth } from '../context/authContext'
import { useCart } from '../context/cartContext'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Bundles', path: '/bundles' },
  { label: 'Wellness', path: '/wellness' },
  { label: 'Cart', path: '/cart' },
]

function Layout() {
  const [cartOpen, setCartOpen] = useState(false)
  const { user } = useAuth()
  const { itemCount } = useCart()

  return (
    <div className="app-shell">
      <PageMetadata /><RouteFocus />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="topbar">
        <Link to="/" className="brand-block" aria-label="PETRO home">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PETRO</div>
            <div className="brand-tag">pet care essentials</div>
          </div>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          <Link to={user ? '/account' : '/login'} className="header-action header-account">
            <span className="header-account-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </span>
            <span className="header-account-copy">
              <span className="header-action-caption">{user ? 'Welcome back' : 'Your PETRO account'}</span>
              <span className="header-action-label">{user ? user.name.split(' ')[0] : 'Login'}</span>
            </span>
          </Link>
          <button type="button" onClick={() => setCartOpen(true)} aria-haspopup="dialog" className="header-action header-cart" aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 7h14l1 14H4L5 7Z" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" />
            </svg>
            <span>Cart</span>
            <span className="header-cart-count">{itemCount}</span>
          </button>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="page-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>PETRO</strong>
          <span>Premium pet care essentials</span>
        </div>
        <div>
          <strong>Explore</strong>
          <Link to="/shop">Shop products</Link><Link to="/bundles">Care bundles</Link>
        </div>
        <div>
          <strong>Your PETRO</strong>
          <Link to="/account">My account</Link><Link to="/wishlist">My wishlist</Link>
        </div>
      </footer>
    </div>
  )
}

export default Layout
