import jwt from 'jsonwebtoken';

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET env var');
  }

  return process.env.JWT_SECRET;
};

export const signToken = (userId) =>
  jwt.sign({ id: userId }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, getSecret());
