import BundlesSection from '../components/BundlesSection'

function BundlesPage() {
  return (
    <section className="page-panel">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">Care bundles</span>
        <h1>A little care, better together.</h1>
        <p>Pair everyday essentials in a convenient care routine and save compared with buying separately.</p>
      </div>
      <BundlesSection />
    </section>
  )
}

export default BundlesPage
