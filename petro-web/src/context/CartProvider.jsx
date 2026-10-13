import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { CartContext, getCartItemKey } from './cartContext'

const CART_KEY = 'petro_cart'

const clampQuantity = (quantity, stock) => Math.max(1, Math.min(quantity, stock))

const readStoredCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY))
    return Array.isArray(stored) ? stored.filter((item) => item.key && item.quantity > 0) : []
  } catch {
    return []
  }
}

function cartReducer(items, action) {
  switch (action.type) {
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

function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, readStoredCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      // storage unavailable (private mode); the cart still works until refresh
    }
  }, [items])

  const addItem = useCallback((product, variant, quantity = 1) => {
    if (variant.stock <= 0) {
      return
    }

    dispatch({
      type: 'add',
      quantity,
      item: {
        key: getCartItemKey(product.slug, variant.label),
        slug: product.slug,
        name: product.name,
        accent: product.accent,
        variantLabel: variant.label,
        price: variant.price,
        stock: variant.stock,
      },
    })
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    dispatch({ type: 'update', key, quantity })
  }, [])

  const removeItem = useCallback((key) => {
    dispatch({ type: 'remove', key })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'clear' })
  }, [])

  const value = useMemo(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

    return { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart }
  }, [items, addItem, updateQuantity, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider
