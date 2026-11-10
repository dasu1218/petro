export const FREE_DELIVERY_THRESHOLD = 4500
export const DELIVERY_METHODS = [
  { id: 'standard', name: 'Standard delivery', fee: 350, description: 'Free on orders of LKR 4,500 or more.' },
  { id: 'express', name: 'Express delivery', fee: 650, description: 'Express delivery fees apply to all orders.' },
]

export const ADDRESS_FIELDS = [
  { name: 'fullName', label: 'Full name', autoComplete: 'shipping name', maxLength: 80 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
  { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'shipping tel', maxLength: 24 },
  { name: 'addressLine1', label: 'Street address', autoComplete: 'shipping address-line1', maxLength: 160, wide: true },
  { name: 'addressLine2', label: 'Apartment, suite, or landmark (optional)', autoComplete: 'shipping address-line2', maxLength: 160, optional: true, wide: true },
  { name: 'city', label: 'City', autoComplete: 'shipping address-level2', maxLength: 80 },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'shipping postal-code', maxLength: 10 },
]

export function validateCheckout(address, deliveryMethod) {
  const errors = {}
  const normalized = { country: 'Sri Lanka' }
  for (const field of ADDRESS_FIELDS) {
    const value = typeof address[field.name] === 'string' ? address[field.name].trim() : ''
    normalized[field.name] = value
    if (!field.optional && !value) errors[field.name] = `${field.label} is required.`
    else if (value.length > field.maxLength) errors[field.name] = `${field.label} is too long.`
  }
  if (normalized.email && !/^\S+@\S+\.\S+$/.test(normalized.email)) errors.email = 'Enter a valid email address.'
  const phoneDigits = normalized.phone.replace(/\D/g, '')
  if (normalized.phone && (!/^\+?[\d\s()-]+$/.test(normalized.phone) || phoneDigits.length < 9 || phoneDigits.length > 15)) errors.phone = 'Enter a valid phone number with 9 to 15 digits.'
  if (!DELIVERY_METHODS.some((method) => method.id === deliveryMethod)) errors.deliveryMethod = 'Choose a delivery method.'
  return { address: normalized, errors }
}

export function getCheckoutTotals(items, deliveryMethod) {
  const method = DELIVERY_METHODS.find((entry) => entry.id === deliveryMethod)
  if (!method) throw new Error('Unknown delivery method')
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = items.length === 0 || (method.id === 'standard' && subtotal >= FREE_DELIVERY_THRESHOLD) ? 0 : method.fee
  return { subtotal, delivery, total: subtotal + delivery }
}

export function getCheckoutFingerprint(items, address, deliveryMethod) {
  return JSON.stringify({
    items: items.map(({ key, price, quantity, stock }) => ({ key, price, quantity, stock })),
    address, deliveryMethod,
  })
}
