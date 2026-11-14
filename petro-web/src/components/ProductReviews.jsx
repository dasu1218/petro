import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
function ReviewsContent({ slug }) {
  const { user, token } = useAuth()
  const location = useLocation()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [mine, setMine] = useState({ loading: Boolean(user), review: null, error: '' })
  const [draft, setDraft] = useState({ rating: 5, comment: '' })
  useEffect(() => {
    let ignore = false
    apiRequest(`/reviews/${slug}?page=${page}`).then((data) => {
      if (!ignore) { setResult(data); setError('') }
    }).catch((failure) => { if (!ignore) setError(failure.message) })
    return () => { ignore = true }
  }, [slug, page, version])
  useEffect(() => {
    if (!user) return
    let ignore = false
    apiRequest(`/reviews/${slug}/mine`, { token }).then(({ review }) => {
      if (!ignore) {
        setMine({ loading: false, review, error: '' })
        setDraft(review ? { rating: review.rating, comment: review.comment } : { rating: 5, comment: '' })
      }
    }).catch((failure) => { if (!ignore) setMine({ loading: false, review: null, error: failure.message }) })
    return () => { ignore = true }
  }, [slug, version, user, token])
  const refresh = () => { setResult(null); setMine((current) => ({ ...current, loading: Boolean(user), error: '' })); setVersion((value) => value + 1) }
  const save = async (event) => {
    event.preventDefault()
    if (!draft.comment.trim()) { setError('Please write your review.'); return }
    setBusy(true); setError(''); setFeedback('')
    try { await apiRequest(`/reviews/${slug}`, { method: 'PUT', token, body: draft }); setFeedback('Your review was saved.'); refresh() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true); setError(''); setFeedback('')
    try { await apiRequest(`/reviews/${slug}`, { method: 'DELETE', token }); setFeedback('Your review was deleted.'); refresh() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section id="product-reviews" className="detail-description-section"><h2>Customer reviews</h2>
    {error && <div role="alert"><p className="form-error">{error}</p><button type="button" className="btn btn-secondary btn-large" onClick={refresh}>Reload reviews</button></div>}<p role="status">{feedback}</p>
    {!result ? !error && <p role="status">Loading reviews…</p> : <>
      <p>{result.count ? `${result.rating} / 5 from ${result.count} reviews` : 'No reviews yet. Be the first to share your experience.'}</p>
      <ul className="review-list">{result.reviews.map((review) => <li key={review.id} className="checkout-panel"><strong>{review.authorName}</strong><p aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p><p className="review-comment">{review.comment}</p></li>)}</ul>
      <div className="cta-row"><button type="button" className="btn btn-secondary btn-large" disabled={busy || page === 1} onClick={() => { setResult(null); setPage((value) => value - 1) }}>Previous</button><span>Page {page}</span><button type="button" className="btn btn-secondary btn-large" disabled={busy || !result.hasMore} onClick={() => { setResult(null); setPage((value) => value + 1) }}>Next</button></div>
      {user ? mine.loading ? <p role="status">Loading your review…</p> : mine.error ? <div role="alert"><p>{mine.error}</p><button type="button" className="btn btn-secondary" onClick={refresh}>Reload your review</button></div> : <form className="checkout-form" onSubmit={save}><fieldset className="checkout-panel" disabled={busy}><legend>{mine.review ? 'Edit your review' : 'Write a review'}</legend><p>Your display name and review will be public. One review per product.</p><label className="form-field"><span>Rating</span><select value={draft.rating} onChange={(event) => setDraft((current) => ({ ...current, rating: Number(event.target.value) }))}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label className="form-field"><span>Your review</span><textarea required maxLength={1000} rows={4} value={draft.comment} onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))} /></label><div className="cta-row account-actions"><button type="submit" className="btn btn-primary btn-large">{busy ? 'Saving…' : 'Save review'}</button>{mine.review && <button type="button" className="btn btn-secondary btn-large" onClick={remove}>Delete my review</button>}</div></fieldset></form> : <p><Link to="/login" state={{ from: location }}>Log in to write a review</Link></p>}
    </>}
  </section>
}
export default function ProductReviews({ slug }) {
  const { user } = useAuth()
  return <ReviewsContent key={`${slug}:${user?.id || 'guest'}`} slug={slug} />
}
