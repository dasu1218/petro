import { createContext, useContext } from 'react'

export const FREE_DELIVERY_THRESHOLD = 4500

export const CartContext = createContext(null)

export const getCartItemKey = (slug, variantLabel) => `${slug}:${variantLabel}`

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>')
  }

  return context
}
