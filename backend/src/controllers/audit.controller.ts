import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: req.user!.tenant_id },
    include: { user: { select: { email: true, fullName: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });
  res.json(logs);
};
