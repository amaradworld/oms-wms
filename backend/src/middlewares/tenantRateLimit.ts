import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const tenantHits = new Map<string, { count: number; resetAt: number }>();

export function tenantRateLimit(maxRequests: number = 500, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenant_id || req.ip || 'unknown';
    const now = Date.now();
    const entry = tenantHits.get(tenantId);

    if (!entry || now > entry.resetAt) {
      tenantHits.set(tenantId, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    next();
  };
}

export const cleanupTenantRateLimits = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tenantHits.entries()) {
    if (now > entry.resetAt) tenantHits.delete(key);
  }
}, 60_000);

export default tenantRateLimit;
