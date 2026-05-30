import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '100', entityType, action, from, to, tenantId } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = Math.min(parseInt(limit as string), 500);

  const isPlatform = req.user!.role === 'PLATFORM_ADMIN';
  const where: any = {};
  if (isPlatform) {
    if (tenantId) where.tenantId = tenantId;
  } else {
    where.tenantId = req.user!.tenant_id;
  }
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from as string);
    if (to) where.timestamp.lte = new Date(to as string);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, page: parseInt(page as string), limit: take });
};

export const exportAuditLogs = async (req: AuthRequest, res: Response) => {
  const { entityType, action, from, to, tenantId } = req.query;

  const isPlatform = req.user!.role === 'PLATFORM_ADMIN';
  const where: any = {};
  if (isPlatform) {
    if (tenantId) where.tenantId = tenantId;
  } else {
    where.tenantId = req.user!.tenant_id;
  }
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from as string);
    if (to) where.timestamp.lte = new Date(to as string);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { email: true, fullName: true } } },
    orderBy: { timestamp: 'desc' },
    take: 10000,
  });

  const header = 'Timestamp,User,Action,Entity Type,Entity ID,Details\n';
  const rows = logs.map(l => {
    const user = l.user?.email || l.userId;
    const details = JSON.stringify(l.newValue || l.oldValue || {});
    return `${l.timestamp.toISOString()},"${user}","${l.action}","${l.entityType}","${l.entityId || ''}","${details.replace(/"/g, '""')}"`;
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=audit-log-${req.user!.tenant_id || tenantId || 'all'}.csv`);
  res.send(header + rows);
};
