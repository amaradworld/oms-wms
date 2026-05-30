import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY;
console.log(`[apiKey] API_KEY configured: ${API_KEY ? 'YES' : 'NO'}`);

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) return next();

  const provided = req.headers['x-api-key'] as string || req.query.api_key as string;
  if (!provided || provided !== API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }

  next();
};
