import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';

export const protect = async (request, response, next) => {
  const header = request.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const { id, version = 0 } = verifyToken(token);
    const user = await User.findById(id);

    if (!user) {
      return response.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (version !== (user.tokenVersion || 0)) return response.status(401).json({ message: 'Your session expired. Please log in again.' });

    request.user = user;
    return next();
  } catch {
    return response.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

export const admin = (request, response, next) => {
  if (request.user?.role !== 'admin') {
    return response.status(403).json({ message: 'Admin access required' });
  }

  return next();
};
