import User from '../models/User.js';
import { signToken } from '../utils/token.js';

const sendAuthResponse = (response, statusCode, user) => {
  response.status(statusCode).json({
    token: signToken(user._id),
    user,
  });
};

export const register = async (request, response) => {
  const { name, email, password } = request.body || {};

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim() || !password) {
    return response.status(400).json({ message: 'Name, email, and password are required' });
  }

  if (name.trim().length > 80 || email.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'Enter a valid name, email, and password of at least 8 characters and at most 72 UTF-8 bytes' });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });

  if (existing) {
    return response.status(409).json({ message: 'An account with this email already exists' });
  }

  // role is never taken from the request body, so new accounts are always customers
  const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password });

  return sendAuthResponse(response, 201, user);
};

export const login = async (request, response) => {
  const { email, password } = request.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || email.length > 254) {
    return response.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }

  return sendAuthResponse(response, 200, user);
};

export const getMe = (request, response) => {
  response.json({ user: request.user });
};
