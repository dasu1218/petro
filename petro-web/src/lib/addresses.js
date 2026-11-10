import { ADDRESS_FIELDS } from './checkout.js'

export function checkoutAddress(saved, user) {
  const result = { country: 'Sri Lanka' }
  for (const { name } of ADDRESS_FIELDS) {
    result[name] = saved?.[name] ?? (name === 'fullName' ? user.name : name === 'email' ? user.email : '')
  }
  return result
}
export function defaultSavedAddress(user) {
  return user.addresses?.find((address) => String(address._id) === String(user.defaultAddressId)) || null
}
