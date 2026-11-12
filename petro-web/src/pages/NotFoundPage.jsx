import { Link } from 'react-router-dom'
function NotFoundPage() {
  return (
    <section className="page-panel page-center">
      <span className="eyebrow eyebrow-muted">404</span>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p><div className="cta-row"><Link to="/" className="btn btn-primary btn-large">Back to home</Link><Link to="/shop" className="btn btn-secondary btn-large">Browse products</Link></div>
    </section>
  )
}

export default NotFoundPage
