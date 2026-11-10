import { createContext, useContext } from 'react'
export const ProductContext = createContext(null)
export function useProducts() { return useContext(ProductContext) }
