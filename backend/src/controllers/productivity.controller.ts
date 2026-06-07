import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getProductivityStats = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string;
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: any = { tenantId: tenant_id, recordedAt: { gte: since } };
  if (warehouseId) where.warehouseId = warehouseId;

  const logs = await prisma.productivityLog.findMany({ where, orderBy: { recordedAt: 'desc' } });

  const byActivity: Record<string, { count: number; totalQty: number; totalMin: number }> = {};
  const byUser: Record<string, { count: number; totalQty: number; totalMin: number }> = {};
  const daily: Record<string, { count: number; totalQty: number }> = {};

  for (const log of logs) {
    if (!byActivity[log.activity]) byActivity[log.activity] = { count: 0, totalQty: 0, totalMin: 0 };
    byActivity[log.activity].count++;
    byActivity[log.activity].totalQty += log.quantity;
    if (log.durationMin) byActivity[log.activity].totalMin += log.durationMin;

    const uid = log.userId || 'unknown';
    if (!byUser[uid]) byUser[uid] = { count: 0, totalQty: 0, totalMin: 0 };
    byUser[uid].count++;
    byUser[uid].totalQty += log.quantity;
    if (log.durationMin) byUser[uid].totalMin += log.durationMin;

    const dayKey = log.recordedAt.toISOString().split('T')[0];
    if (!daily[dayKey]) daily[dayKey] = { count: 0, totalQty: 0 };
    daily[dayKey].count++;
    daily[dayKey].totalQty += log.quantity;
  }

  const users = await prisma.user.findMany({
    where: { tenantId: tenant_id, id: { in: Object.keys(byUser).filter(id => id !== 'unknown') } },
    select: { id: true, fullName: true, email: true, role: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const userStats = Object.entries(byUser).map(([id, s]) => ({
    userId: id,
    name: userMap[id]?.fullName || userMap[id]?.email || id,
    role: userMap[id]?.role || '',
    ...s,
    itemsPerHour: s.totalMin > 0 ? Math.round((s.totalQty / s.totalMin) * 60) : 0,
  }));

  res.json({
    summary: {
      totalLogs: logs.length,
      totalQty: logs.reduce((a, l) => a + l.quantity, 0),
      totalMin: logs.reduce((a, l) => a + (l.durationMin || 0), 0),
    },
    byActivity,
    byUser: userStats,
    daily: Object.entries(daily).map(([date, s]) => ({ date, ...s })),
  });
};

export const logActivity = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const { activity, entityType, entityId, quantity, durationMin, warehouseId } = req.body;
  if (!activity) return res.status(400).json({ message: 'Activity type is required' });

  const log = await prisma.productivityLog.create({
    data: { tenantId: tenant_id, warehouseId, userId: req.user!.id, activity, entityType, entityId, quantity: quantity || 0, durationMin },
  });
  res.status(201).json(log);
};

export const getPickerProductivity = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const activity = (req.query.activity as string) || 'PICKING';

  const logs = await prisma.productivityLog.findMany({
    where: { tenantId: tenant_id, activity, recordedAt: { gte: since } },
    select: { userId: true, quantity: true, durationMin: true, recordedAt: true, warehouseId: true },
  });

  const byUser: Record<string, { count: number; totalQty: number; totalMin: number; warehouses: Set<string> }> = {};
  for (const l of logs) {
    if (!l.userId) continue;
    if (!byUser[l.userId]) byUser[l.userId] = { count: 0, totalQty: 0, totalMin: 0, warehouses: new Set() };
    byUser[l.userId].count++;
    byUser[l.userId].totalQty += l.quantity;
    if (l.durationMin) byUser[l.userId].totalMin += l.durationMin;
    if (l.warehouseId) byUser[l.userId].warehouses.add(l.warehouseId);
  }

  const userIds = Object.keys(byUser);
  const users = await prisma.user.findMany({
    where: { tenantId: tenant_id, id: { in: userIds } },
    select: { id: true, fullName: true, email: true, role: true, warehouseId: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const dayBuckets: Record<string, { count: number; totalQty: number }> = {};
  for (const l of logs) {
    const day = l.recordedAt.toISOString().split('T')[0];
    if (!dayBuckets[day]) dayBuckets[day] = { count: 0, totalQty: 0 };
    dayBuckets[day].count++;
    dayBuckets[day].totalQty += l.quantity;
  }

  const pickerStats = Object.entries(byUser)
    .map(([id, s]) => {
      const u = userMap[id];
      return {
        userId: id,
        name: u?.fullName || u?.email || id,
        role: u?.role || '',
        warehouseId: u?.warehouseId || (Array.from(s.warehouses)[0] || null),
        logs: s.count,
        totalQty: s.totalQty,
        totalMin: s.totalMin,
        picksPerHour: s.totalMin > 0 ? Math.round((s.totalQty / s.totalMin) * 60 * 10) / 10 : 0,
        avgPerSession: s.count > 0 ? Math.round((s.totalQty / s.count) * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.picksPerHour - a.picksPerHour);

  res.json({
    window: { days, from: since.toISOString(), to: new Date().toISOString(), activity },
    summary: {
      totalLogs: logs.length,
      totalQty: logs.reduce((a, l) => a + l.quantity, 0),
      totalMin: logs.reduce((a, l) => a + (l.durationMin || 0), 0),
      uniquePickers: userIds.length,
    },
    byPicker: pickerStats,
    daily: Object.entries(dayBuckets).map(([date, s]) => ({ date, ...s })).sort((a, b) => a.date.localeCompare(b.date)),
  });
};
