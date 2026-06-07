import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const PLATFORM_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || 'owner@supplyhub.com';

export interface AuthRequest extends Request {
  user?: { id: string; tenant_id: string; role: string; email?: string; warehouseId?: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as any;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};

export const requirePlatformOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN' || req.user.email !== PLATFORM_OWNER_EMAIL) {
    return res.status(403).json({ message: 'Platform owner access required' });
  }
  next();
};

export const tenantScope = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next();
  if (req.user.role === 'PLATFORM_ADMIN') return next();
  if (req.body && typeof req.body === 'object' && 'tenantId' in req.body) {
    const provided = (req.body as any).tenantId;
    if (provided && provided !== req.user.tenant_id) {
      return res.status(403).json({ message: 'Cross-tenant access denied' });
    }
    (req.body as any).tenantId = req.user.tenant_id;
  }
  if (req.query && typeof req.query === 'object' && 'tenantId' in req.query) {
    const provided = req.query.tenantId as string;
    if (provided && provided !== req.user.tenant_id) {
      return res.status(403).json({ message: 'Cross-tenant access denied' });
    }
    delete (req.query as any).tenantId;
  }
  next();
};
