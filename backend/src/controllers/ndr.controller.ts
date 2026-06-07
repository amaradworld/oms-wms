import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit, logUpdateAudit, captureSnapshot } from '../services/audit.service';

export const getNdrCases = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { status, courier } = req.query;
  const where: any = { tenantId };
  if (status) where.status = status as string;
  if (courier) where.courierName = courier as string;

  const cases = await prisma.ndrCase.findMany({
    where,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          shippingAddress: true,
          orderStatus: true,
          tracking: { select: { awbNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(cases);
};

export const getNdrStats = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const where = { tenantId };

  const [open, reattemptScheduled, resolved, closed, total, responded, avgRow] = await Promise.all([
    prisma.ndrCase.count({ where: { ...where, status: 'OPEN' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'REATTEMPT_SCHEDULED' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'RESOLVED' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.ndrCase.count({ where }),
    prisma.ndrCase.count({ where: { ...where, firstResponseAt: { not: null } } }),
    prisma.ndrCase.findMany({
      where: { ...where, firstResponseAt: { not: null } },
      select: { firstResponseAt: true, resolvedAt: true, createdAt: true },
    }),
  ]);

  const responseTimes = avgRow
    .map(r => (r.firstResponseAt!.getTime() - r.createdAt.getTime()) / 1000)
    .sort((a, b) => a - b);
  const resolveTimes = avgRow
    .filter(r => r.resolvedAt)
    .map(r => (r.resolvedAt!.getTime() - r.createdAt.getTime()) / 1000)
    .sort((a, b) => a - b);
  const p = (arr: number[], q: number) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0;
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  res.json({
    total, open, reattemptScheduled, resolved, closed,
    response: {
      responded,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      avgFirstResponseSec: avg(responseTimes),
      p50FirstResponseSec: p(responseTimes, 0.5),
      p95FirstResponseSec: p(responseTimes, 0.95),
      avgResolveSec: avg(resolveTimes),
      p50ResolveSec: p(resolveTimes, 0.5),
      p95ResolveSec: p(resolveTimes, 0.95),
    },
  });
};

export const getNdrResponseRate = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const cases = await prisma.ndrCase.findMany({
    where: { tenantId, createdAt: { gte: since } },
    select: {
      id: true, status: true, createdAt: true, firstResponseAt: true, resolvedAt: true,
      courierName: true, source: true,
    },
  });

  const total = cases.length;
  const responded = cases.filter(c => c.firstResponseAt).length;
  const responseTimes = cases
    .filter(c => c.firstResponseAt)
    .map(c => (c.firstResponseAt!.getTime() - c.createdAt.getTime()) / 1000)
    .sort((a, b) => a - b);
  const resolveTimes = cases
    .filter(c => c.resolvedAt)
    .map(c => (c.resolvedAt!.getTime() - c.createdAt.getTime()) / 1000)
    .sort((a, b) => a - b);

  const p = (arr: number[], q: number) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0;
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const bucket = (sec: number) => {
    if (sec <= 0) return null;
    if (sec < 60) return '<1m';
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    return `${Math.floor(sec / 86400)}d`;
  };
  const distribution: Record<string, number> = { '<1m': 0, '1-15m': 0, '15-60m': 0, '1-4h': 0, '4-24h': 0, '1-3d': 0, '3d+': 0 };
  for (const t of responseTimes) {
    if (t < 60) distribution['<1m']++;
    else if (t < 900) distribution['1-15m']++;
    else if (t < 3600) distribution['15-60m']++;
    else if (t < 14400) distribution['1-4h']++;
    else if (t < 86400) distribution['4-24h']++;
    else if (t < 259200) distribution['1-3d']++;
    else distribution['3d+']++;
  }

  const byStatus = cases.reduce<Record<string, number>>((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
  const byCourier = cases.reduce<Record<string, { total: number; responded: number }>>((acc, c) => {
    if (!acc[c.courierName]) acc[c.courierName] = { total: 0, responded: 0 };
    acc[c.courierName].total++;
    if (c.firstResponseAt) acc[c.courierName].responded++;
    return acc;
  }, {});

  res.json({
    window: { days, from: since.toISOString(), to: new Date().toISOString() },
    total,
    responded,
    notResponded: total - responded,
    responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
    firstResponse: {
      avgSec: avg(responseTimes),
      p50Sec: p(responseTimes, 0.5),
      p95Sec: p(responseTimes, 0.95),
      avgHuman: bucket(avg(responseTimes)),
      p95Human: bucket(p(responseTimes, 0.95)),
    },
    resolution: {
      avgSec: avg(resolveTimes),
      p50Sec: p(resolveTimes, 0.5),
      p95Sec: p(resolveTimes, 0.95),
      avgHuman: bucket(avg(resolveTimes)),
    },
    distribution,
    byStatus,
    byCourier: Object.fromEntries(Object.entries(byCourier).map(([k, v]) => [k, { ...v, responseRate: v.total > 0 ? Math.round((v.responded / v.total) * 100) : 0 }])),
  });
};

export const createNdrCase = async (req: AuthRequest, res: Response) => {
  const { orderId, failureReason } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

  const existing = await prisma.ndrCase.findFirst({ where: { orderId, status: { not: 'CLOSED' } } });
  if (existing) return res.status(409).json({ message: 'Open NDR case already exists for this order', ndr: existing });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const ndr = await prisma.ndrCase.create({
    data: {
      tenantId,
      orderId,
      courierName: order.tracking?.courierName || 'UNKNOWN',
      awbNumber: order.tracking?.awbNumber || null,
      failureReason: failureReason || 'Delivery failed',
    },
    include: {
      order: { select: { orderNumber: true, customerName: true, orderStatus: true } },
    },
  });

  await logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', entityType: 'NdrCase', entityId: ndr.id, newValue: { orderId, courierName: ndr.courierName, failureReason: ndr.failureReason } });
  res.status(201).json(ndr);
};

export const scheduleReattempt = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { reattemptDate, notes } = req.body;

  if (!reattemptDate) return res.status(400).json({ message: 'Reattempt date is required' });

  const ndr = await prisma.ndrCase.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!ndr) return res.status(404).json({ message: 'NDR case not found' });

  const before = await captureSnapshot('NdrCase', id);
  const now = new Date();
  const data: any = {
    status: 'REATTEMPT_SCHEDULED',
    reattemptDate: new Date(reattemptDate),
    notes: notes || ndr.notes,
  };
  if (!ndr.firstResponseAt) data.firstResponseAt = now;

  const updated = await prisma.ndrCase.update({ where: { id }, data });
  await logUpdateAudit({
    tenantId: req.user!.tenant_id,
    userId: req.user!.id,
    action: 'SCHEDULE_REATTEMPT',
    entityType: 'NdrCase',
    entityId: id,
    before,
    after: { ...before, ...data } as any,
  });

  res.json(updated);
};

export const resolveNdrCase = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { notes } = req.body;

  const ndr = await prisma.ndrCase.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!ndr) return res.status(404).json({ message: 'NDR case not found' });

  const before = await captureSnapshot('NdrCase', id);
  const now = new Date();
  const data: any = {
    status: 'RESOLVED',
    notes: notes || ndr.notes,
  };
  if (!ndr.firstResponseAt) data.firstResponseAt = now;
  if (!ndr.resolvedAt) data.resolvedAt = now;

  const updated = await prisma.ndrCase.update({ where: { id }, data });
  await logUpdateAudit({
    tenantId: req.user!.tenant_id,
    userId: req.user!.id,
    action: 'RESOLVE',
    entityType: 'NdrCase',
    entityId: id,
    before,
    after: { ...before, ...data } as any,
  });

  res.json(updated);
};

export const closeNdrCase = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { notes } = req.body;

  const ndr = await prisma.ndrCase.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!ndr) return res.status(404).json({ message: 'NDR case not found' });

  const before = await captureSnapshot('NdrCase', id);
  const now = new Date();
  const data: any = {
    status: 'CLOSED',
    notes: notes || ndr.notes,
  };
  if (!ndr.firstResponseAt) data.firstResponseAt = now;
  if (!ndr.resolvedAt) data.resolvedAt = now;

  const updated = await prisma.ndrCase.update({ where: { id }, data });
  await logUpdateAudit({
    tenantId: req.user!.tenant_id,
    userId: req.user!.id,
    action: 'CLOSE',
    entityType: 'NdrCase',
    entityId: id,
    before,
    after: { ...before, ...data } as any,
  });

  res.json(updated);
};
