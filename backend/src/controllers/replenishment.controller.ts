import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getReplenishmentTasks = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const status = req.query.status as string;
  const where: any = { tenantId: tenant_id };
  if (status) where.status = status;

  const tasks = await prisma.replenishmentTask.findMany({
    where,
    include: { sku: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(tasks);
};

export const createReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const { skuId, fromBin, toBin, quantity, priority, notes, warehouseId } = req.body;
  if (!skuId || !toBin || !quantity) return res.status(400).json({ message: 'skuId, toBin, and quantity are required' });

  const task = await prisma.replenishmentTask.create({
    data: { tenantId: tenant_id, warehouseId, skuId, fromBin, toBin, quantity, priority, notes },
    include: { sku: true },
  });
  res.status(201).json(task);
};

export const completeReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const task = await prisma.replenishmentTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  const updated = await prisma.replenishmentTask.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), completedBy: req.user!.id },
    include: { sku: true },
  });
  res.json(updated);
};

export const cancelReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const task = await prisma.replenishmentTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  const updated = await prisma.replenishmentTask.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
};

export const generateFromAlerts = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string;
  const invWhere: any = { tenantId: tenant_id, reorderPoint: { gt: 0 } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  const lowItems = await prisma.inventory.findMany({
    where: { ...invWhere, quantityAvailable: { lte: prisma.inventory.fields.reorderPoint } },
    include: { sku: true, warehouse: true },
  });

  const created = [];
  for (const item of lowItems) {
    const existing = await prisma.replenishmentTask.findFirst({
      where: { tenantId: tenant_id, skuId: item.skuId, toBin: item.binLocation, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    if (existing) continue;

    const task = await prisma.replenishmentTask.create({
      data: {
        tenantId: tenant_id,
        warehouseId: item.warehouseId,
        skuId: item.skuId,
        toBin: item.binLocation,
        quantity: item.reorderPoint * 2,
        priority: item.quantityAvailable === 0 ? 'CRITICAL' : 'HIGH',
        notes: `Auto-generated from low stock alert (available: ${item.quantityAvailable}, reorder: ${item.reorderPoint})`,
      },
      include: { sku: true },
    });
    created.push(task);
  }

  res.json({ created: created.length, tasks: created });
};
