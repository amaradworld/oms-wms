import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getExpiringStock = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string;
  const days = parseInt(req.query.days as string) || 30;

  const now = new Date();
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const where: any = { tenantId: tenant_id, expiryDate: { not: null, lte: threshold }, quantityOnHand: { gt: 0 } };
  if (warehouseId) where.warehouseId = warehouseId;

  const items = await prisma.inventory.findMany({
    where,
    include: { sku: true, warehouse: true },
    orderBy: { expiryDate: 'asc' },
  });

  res.json({
    total: items.length,
    expired: items.filter(i => i.expiryDate! < now),
    expiringSoon: items.filter(i => i.expiryDate! >= now),
    days,
  });
};

export const getGrnExpiryTracking = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const items = await prisma.grnItem.findMany({
    where: { grn: { tenantId: tenant_id }, expiryDate: { not: null } },
    include: { sku: true, grn: true },
    orderBy: { expiryDate: 'asc' },
  });
  res.json(items);
};
