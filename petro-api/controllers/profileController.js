import mongoose from 'mongoose';
import User from '../models/User.js';
import { orderError, validateShippingAddress } from '../services/orderPlan.js';

const sendUser = (response, user, status = 200) => response.status(status).json({ user });
export async function updateProfile(request, response) {
  const { name, email, currentPassword } = request.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw orderError('Enter a name of up to 80 characters');
  if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim())) throw orderError('Enter a valid email address');
  const user = request.user;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== user.email) {
    if (typeof currentPassword !== 'string' || !currentPassword) throw orderError('Your current password is required to change your email');
    const credentials = await User.findById(user._id).select('+password');
    if (!credentials || !await credentials.matchPassword(currentPassword)) throw orderError('Current password is incorrect', 403);
  }
  user.name = name.trim();
  user.email = normalizedEmail;
  await user.save();
  return sendUser(response, user);
}

export function validateSavedAddress(body) {
  if (!body || typeof body !== 'object') throw orderError('Address details are required');
  if (typeof body.label !== 'string' || !body.label.trim() || body.label.trim().length > 40) throw orderError('Enter an address label of up to 40 characters');
  if (body.isDefault !== undefined && typeof body.isDefault !== 'boolean') throw orderError('Default address must be true or false');
  return { label: body.label.trim(), ...validateShippingAddress(body) };
}
function findAddress(user, id) {
  if (!mongoose.isValidObjectId(id)) throw orderError('Address not found', 404);
  const address = user.addresses.id(id);
  if (!address) throw orderError('Address not found', 404);
  return address;
}
export async function addAddress(request, response) {
  const user = request.user;
  const data = validateSavedAddress(request.body);
  if (user.addresses.length >= 10) throw orderError('You can save up to 10 addresses');
  user.addresses.push(data);
  const address = user.addresses[user.addresses.length - 1];
  if (!user.defaultAddressId || request.body.isDefault) user.defaultAddressId = address._id;
  await user.save();
  return sendUser(response, user, 201);
}
export async function updateAddress(request, response) {
  const user = request.user;
  const address = findAddress(user, request.params.id);
  address.set(validateSavedAddress(request.body));
  if (request.body.isDefault) user.defaultAddressId = address._id;
  await user.save();
  return sendUser(response, user);
}
export async function deleteAddress(request, response) {
  const user = request.user;
  const address = findAddress(user, request.params.id);
  const wasDefault = String(user.defaultAddressId) === String(address._id);
  address.deleteOne();
  if (wasDefault) user.defaultAddressId = user.addresses[0]?._id || null;
  await user.save();
  return sendUser(response, user);
}
export async function setDefaultAddress(request, response) {
  const address = findAddress(request.user, request.params.id);
  request.user.defaultAddressId = address._id;
  await request.user.save();
  return sendUser(response, request.user);
}
