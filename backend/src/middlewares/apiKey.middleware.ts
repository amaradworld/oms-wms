import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (API_KEY) {
    const provided = req.headers['x-api-key'] as string || req.query.api_key as string;
    if (provided && provided === API_KEY) return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (token && JWT_SECRET) {
    try {
      jwt.verify(token, JWT_SECRET);
      return next();
    } catch (err) {
      // Token invalid/expired — fall through to 401
    }
  }

  return res.status(401).json({ message: 'Authentication required (API key or valid token)' });
};
