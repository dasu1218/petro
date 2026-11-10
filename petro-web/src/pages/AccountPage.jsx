import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'

function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">My account</span>
        <h1>Hi, {user.name.split(' ')[0]}</h1>
        <p>View your orders and account details. Saved addresses and profile editing are coming soon.</p>
      </div>

      <div className="cart-summary">
        <div className="cart-item">
          <span>Name</span>
          <strong>{user.name}</strong>
        </div>
        <div className="cart-item">
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className="cart-item">
          <span>Account type</span>
          <strong>{user.role === 'admin' ? 'Admin' : 'Customer'}</strong>
        </div>
      </div>

      <div className="cta-row account-actions">
        <Link to="/orders" className="btn btn-primary btn-large">View orders</Link>
        <button type="button" className="btn btn-secondary btn-large" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </section>
  )
}

export default AccountPage
