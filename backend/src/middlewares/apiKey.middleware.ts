import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (API_KEY) {
    const provided = req.headers['x-api-key'] as string;
    if (provided && timingSafeCompare(provided, API_KEY)) return next();
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
