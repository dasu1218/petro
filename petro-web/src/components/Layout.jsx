import { Link, NavLink, Outlet } from 'react-router-dom'
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
  const { user } = useAuth()
  const { itemCount } = useCart()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PETRO</div>
            <div className="brand-tag">pet care essentials</div>
          </div>
        </div>

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
          {user ? (
            <Link to="/account" className="btn btn-secondary">
              {user.name.split(' ')[0]}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          )}
          <Link to="/cart" className="btn btn-primary" aria-label={`Cart, ${itemCount} items`}>
            Cart ({itemCount})
          </Link>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <strong>PETRO</strong>
          <span>Premium pet care essentials</span>
        </div>
        <div>
          <strong>Support</strong>
          <span>hello@petro.com</span>
        </div>
        <div>
          <strong>Hours</strong>
          <span>Mon - Sat · 8AM - 7PM</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
