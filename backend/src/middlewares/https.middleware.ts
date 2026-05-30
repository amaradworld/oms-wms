import { Request, Response, NextFunction } from 'express';

export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  const forwardedProto = req.headers['x-forwarded-proto'] as string | undefined;
  if (forwardedProto && forwardedProto !== 'https') {
    const host = req.headers['host'] || req.hostname;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  next();
};
