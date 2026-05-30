import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY;

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) {
    return res.status(500).json({ message: 'API_KEY not configured on server' });
  }

  const provided = req.headers['x-api-key'] as string || req.query.api_key as string;
  if (!provided || provided !== API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }

  next();
};
