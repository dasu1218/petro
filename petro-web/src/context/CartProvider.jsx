import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useAuth } from './authContext'
import { apiRequest } from '../lib/api'
import { mergeCartItems, readCart } from '../lib/cart.js'
import { CartContext, getCartItemKey } from './cartContext'

const CART_KEY = 'petro_cart'

const clampQuantity = (quantity, stock) => Math.max(1, Math.min(quantity, stock))

function cartReducer(items, action) {
  switch (action.type) {
    case 'replace':
      return action.items

    case 'add': {
      const { item, quantity } = action
      const existing = items.find((current) => current.key === item.key)

      if (existing) {
        return items.map((current) =>
          current.key === item.key
            ? { ...current, quantity: clampQuantity(current.quantity + quantity, current.stock) }
            : current,
        )
      }

      return [...items, { ...item, quantity: clampQuantity(quantity, item.stock) }]
    }

    case 'update':
      return items.map((current) =>
        current.key === action.key
          ? { ...current, quantity: clampQuantity(action.quantity, current.stock) }
          : current,
      )

    case 'remove':
      return items.filter((current) => current.key !== action.key)

    case 'clear':
      return []

    default:
      return items
  }
}

function CartSession({ children, token, userId }) {
  const { logout } = useAuth()
  const pendingKey = userId ? `petro_cart_pending_${userId}` : CART_KEY
  const [items, dispatch] = useReducer(cartReducer, undefined, () => readCart(pendingKey))
  const [ready, setReady] = useState(!token)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const queue = useRef(Promise.resolve())
  const latestRevision = useRef(0)
  const orderLock = useRef(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const beginOrder = useCallback(() => {
    if (orderLock.current) return false
    orderLock.current = true
    setIsPlacingOrder(true)
    return true
  }, [])
  const endOrder = useCallback(() => {
    orderLock.current = false
    setIsPlacingOrder(false)
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (cancelled) return
      setError('')
      const data = await apiRequest('/cart', { token })
      if (cancelled) return
      const pending = readCart(pendingKey, null)
      const merged = mergeCartItems(pending ?? data.items, readCart(CART_KEY))
      const saved = await apiRequest('/cart', { method: 'PUT', token, body: { items: merged } })
      if (cancelled) return
      try {
        localStorage.removeItem(CART_KEY)
        localStorage.removeItem(pendingKey)
      } catch { /* Storage may be unavailable. */ }
      dispatch({ type: 'replace', items: saved.items })
      setReady(true)
    }).catch((failure) => {
      if (!cancelled) setError(failure.message)
    })
    return () => { cancelled = true }
  }, [token, pendingKey, attempt])

  useEffect(() => {
    if (!ready) return
    if (!token) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* In-memory cart still works. */ }
      return
    }
    if (revision === 0) return
    try { localStorage.setItem(pendingKey, JSON.stringify(items)) } catch { /* In-memory cart still works. */ }
    let cancelled = false
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (!cancelled) {
        setSaving(true)
        setError('')
      }
      await apiRequest('/cart', { method: 'PUT', token, body: { items } })
      if (!cancelled && latestRevision.current === revision) {
        try { localStorage.removeItem(pendingKey) } catch { /* Storage may be unavailable. */ }
        setSaving(false)
      }
    }).catch((failure) => {
      if (!cancelled && latestRevision.current === revision) {
        setSaving(false)
        setError(failure.message)
      }
    })
    return () => { cancelled = true }
  }, [items, ready, token, revision, pendingKey])

  const change = useCallback((action) => {
    if (!ready || orderLock.current) return
    dispatch(action)
    latestRevision.current += 1
    setRevision(latestRevision.current)
  }, [ready])

  const addItem = useCallback((product, variant, quantity = 1) => {
    if (variant.stock <= 0) {
      return
    }

    change({
      type: 'add',
      quantity,
      item: {
        key: getCartItemKey(product.slug, variant.label),
        slug: product.slug,
        ...(product.kind === 'bundle' ? { kind: 'bundle' } : {}),
        name: product.name,
        accent: product.accent,
        variantLabel: variant.label,
        price: variant.price,
        stock: variant.stock,
      },
    })
  }, [change])

  const updateQuantity = useCallback((key, quantity) => {
    change({ type: 'update', key, quantity })
  }, [change])

  const removeItem = useCallback((key) => {
    change({ type: 'remove', key })
  }, [change])

  const clearCart = useCallback(() => {
    change({ type: 'clear' })
  }, [change])

  const value = useMemo(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

    return { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart, beginOrder, endOrder }
  }, [items, addItem, updateQuantity, removeItem, clearCart, beginOrder, endOrder])

  const retry = () => {
    if (!ready) setAttempt((value) => value + 1)
    else {
      latestRevision.current += 1
      setRevision(latestRevision.current)
    }
  }

  return (
    <CartContext.Provider value={value}>
      {isPlacingOrder && <p className="cart-sync-notice" role="status">Placing your order… Please wait for confirmation.</p>}
      {token && (!ready || saving || error) && (
        <div className="cart-sync-notice" role="status">
          {error ? `Your cart could not sync. ${error}` : ready ? 'Saving your cart…' : 'Loading your account cart…'}
          {error && <button type="button" onClick={retry}>Retry cart sync</button>}
          {error && !ready && <button type="button" onClick={logout}>Sign out</button>}
        </div>
      )}
      <div style={{ display: 'contents' }} inert={!ready || isPlacingOrder}>{children}</div>
    </CartContext.Provider>
  )
}

function CartProvider({ children }) {
  const { token, user, isLoading } = useAuth()
  if (isLoading) return <p className="cart-sync-notice" role="status">Loading your account…</p>
  return <CartSession key={user?.id || 'guest'} token={user ? token : null} userId={user?.id}>{children}</CartSession>
}

export default CartProvider
