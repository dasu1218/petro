import { Link } from 'react-router-dom'
const topics = [
  { title: 'Grooming & skin care', text: 'Explore shampoos and coat care. Read each product description and choose the size that suits your routine.' },
  { title: 'Everyday nutrition', text: 'Browse nutrition products and compare available sizes, ingredients, and product information.' },
  { title: 'Care bundles', text: 'See which products are included in a bundle and compare the bundle price with buying separately.', path: '/bundles' },
]
export default function WellnessPage() {
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Everyday wellness</span><h1>Build a care routine for your pet.</h1><p>Explore the PETRO catalog, compare product details, and save your favourites for later.</p></div><div className="feature-section">{topics.map((topic) => <article className="feature-card" key={topic.title}><h2>{topic.title}</h2><p>{topic.text}</p><Link to={topic.path || '/shop'}>Explore {topic.title.toLowerCase()}</Link></article>)}</div></section>
}
