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

  if (!name || !email || !password) {
    return response.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });

  if (existing) {
    return response.status(409).json({ message: 'An account with this email already exists' });
  }

  // role is never taken from the request body, so new accounts are always customers
  const user = await User.create({ name, email, password });

  return sendAuthResponse(response, 201, user);
};

export const login = async (request, response) => {
  const { email, password } = request.body || {};

  if (!email || !password) {
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
