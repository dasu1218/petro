import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { useWishlist } from '../context/wishlistContext'
export default function WishlistButton({ slug }) {
  const { user } = useAuth()
  const wishlist = useWishlist()
  const location = useLocation()
  const [error, setError] = useState('')
  if (!user) return <Link to="/login" state={{ from: location }}>Log in to save</Link>
  if (wishlist.error) return <Link to="/wishlist">Reload your wishlist</Link>
  const saved = wishlist.slugs.includes(slug)
  return <div><button type="button" className="wishlist-button" disabled={wishlist.loading || wishlist.busy} aria-pressed={saved} onClick={async () => { setError(''); try { await wishlist.toggle(slug) } catch (failure) { setError(failure.message) } }}>{saved ? '♥ Saved' : '♡ Save to wishlist'}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>
}
