import { useEffect, useState } from 'react'
import { useAuth } from './authContext'
import { WishlistContext } from './wishlistContext'
import { apiRequest } from '../lib/api'
function WishlistSession({ children }) {
  const { user, token } = useAuth()
  const [slugs, setSlugs] = useState([])
  const [loading, setLoading] = useState(Boolean(user))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!user) return
    let ignore = false
    apiRequest('/wishlist', { token }).then((data) => { if (!ignore) { setSlugs(data.slugs); setError('') } }).catch((failure) => { if (!ignore) setError(failure.message) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [user, token, attempt])
  const toggle = async (slug) => {
    if (!user || loading || busy || error) return
    setBusy(true)
    const saved = slugs.includes(slug)
    try {
      await apiRequest(`/wishlist/${slug}`, { token, method: saved ? 'DELETE' : 'PUT' })
      setSlugs((current) => saved ? current.filter((entry) => entry !== slug) : [...current, slug])
    } finally { setBusy(false) }
  }
  return <WishlistContext.Provider value={{ slugs, loading, busy, error, toggle, reload: () => { setLoading(true); setAttempt((value) => value + 1) } }}>{children}</WishlistContext.Provider>
}
export default function WishlistProvider({ children }) {
  const { user } = useAuth()
  return <WishlistSession key={user?.id || 'guest'}>{children}</WishlistSession>
}
