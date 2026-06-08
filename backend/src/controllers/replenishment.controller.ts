import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit, logUpdateAudit, captureSnapshot } from '../services/audit.service';
import { logProductivity, durationMinutes } from '../services/productivityLogger.service';
import { emitInventoryChange } from '../services/marketplaceEvents.service';

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
  logAudit({ tenantId: tenant_id, userId: req.user!.id, action: 'CREATE', entityType: 'ReplenishmentTask', entityId: task.id, newValue: { skuId, quantity, priority } });
};

export const assignReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { assignedTo } = req.body;
  const before = await captureSnapshot('ReplenishmentTask', id);
  const task = await prisma.replenishmentTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  const now = new Date();
  const updated = await prisma.replenishmentTask.update({
    where: { id },
    data: {
      assignedTo: assignedTo || req.user!.id,
      assignedAt: now,
      startedAt: task.startedAt || now,
      status: task.status === 'PENDING' ? 'IN_PROGRESS' : task.status,
    },
    include: { sku: true },
  });
  res.json(updated);
  if (before) {
    await logUpdateAudit({
      tenantId: req.user!.tenant_id, userId: req.user!.id,
      action: 'ASSIGN', entityType: 'ReplenishmentTask', entityId: id,
      before, after: { ...before, ...updated } as any,
    });
  }
};

export const completeReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const before = await captureSnapshot('ReplenishmentTask', id);
  const task = await prisma.replenishmentTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  if (task.fromBin && task.toBin) {
    const fromInv = await prisma.inventory.findFirst({
      where: { warehouseId: task.warehouseId, skuId: task.skuId, binLocation: task.fromBin },
    });
    if (!fromInv || fromInv.quantityAvailable < task.quantity) {
      return res.status(400).json({ message: `Insufficient stock in bin ${task.fromBin} (available: ${fromInv?.quantityAvailable ?? 0}, needed: ${task.quantity})` });
    }
    await prisma.inventory.update({
      where: { id: fromInv.id },
      data: { quantityOnHand: { decrement: task.quantity }, quantityAvailable: { decrement: task.quantity } },
    });
    await prisma.inventory.upsert({
      where: { warehouseId_skuId_binLocation: { warehouseId: task.warehouseId, skuId: task.skuId, binLocation: task.toBin } },
      update: { quantityOnHand: { increment: task.quantity }, quantityAvailable: { increment: task.quantity } },
      create: {
        warehouseId: task.warehouseId, skuId: task.skuId, binLocation: task.toBin,
        quantityOnHand: task.quantity, quantityAvailable: task.quantity,
        virtualInventory: 0, notFound: 0, type: 'Good', status: 'ACTIVE',
        inventoryAllocation: true, inventorySync: true, skuMixing: true, shelfOnHold: false,
      },
    });
    const sku = await prisma.skuMaster.findUnique({ where: { id: task.skuId }, select: { skuCode: true } });
    if (sku) {
      emitInventoryChange({ tenantId: task.tenantId, skuCode: sku.skuCode, quantity: fromInv.quantityOnHand - task.quantity, warehouseId: task.warehouseId });
    }
  }

  const now = new Date();
  const updated = await prisma.replenishmentTask.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: now, completedBy: req.user!.id, startedAt: task.startedAt || now },
    include: { sku: true },
  });

  await logProductivity({
    tenantId: req.user!.tenant_id,
    warehouseId: task.warehouseId,
    userId: req.user!.id,
    activity: 'PUTAWAY',
    entityType: 'ReplenishmentTask',
    entityId: task.id,
    quantity: task.quantity,
    durationMin: durationMinutes(task.startedAt || task.assignedAt || task.createdAt, now),
  });

  res.json(updated);
  if (before) {
    await logUpdateAudit({
      tenantId: req.user!.tenant_id, userId: req.user!.id,
      action: 'COMPLETE', entityType: 'ReplenishmentTask', entityId: id,
      before, after: { ...before, ...updated } as any,
    });
  }
};

export const cancelReplenishmentTask = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const before = await captureSnapshot('ReplenishmentTask', id);
  const task = await prisma.replenishmentTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (task.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  const updated = await prisma.replenishmentTask.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
  if (before) {
    await logUpdateAudit({
      tenantId: req.user!.tenant_id, userId: req.user!.id,
      action: 'CANCEL', entityType: 'ReplenishmentTask', entityId: id,
      before, after: { ...before, ...updated } as any,
    });
  }
};

export const generateFromAlerts = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string;
  const invWhere: any = { tenantId: tenant_id, reorderPoint: { gt: 0 } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  const lowItems = (await prisma.inventory.findMany({
    where: { ...invWhere },
    include: { sku: true, warehouse: true },
  })).filter((item: any) => item.quantityAvailable <= item.reorderPoint);

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
