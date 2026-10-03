import './App.css'
import HomePage from './pages/HomePage'

function App() {
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
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#bundles">Bundles</a>
          <a href="#wellness">Wellness</a>
        </nav>

        <div className="topbar-actions">
          <button type="button" className="btn btn-secondary">
            Login
          </button>
          <button type="button" className="btn btn-primary">
            Cart (2)
          </button>
        </div>
      </header>

      <main className="page-content">
        <HomePage />
      </main>
    </div>
  )
}

export default App
