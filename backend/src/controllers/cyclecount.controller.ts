import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logProductivity, durationMinutes } from '../services/productivityLogger.service';

export const listCycleCounts = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const warehouseId = req.query.warehouseId as string | undefined;
  const where: any = { tenantId };
  if (warehouseId) where.warehouseId = warehouseId;

  const counts = await prisma.cycleCount.findMany({
    where,
    include: {
      warehouse: { select: { name: true } },
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(counts);
};

export const getCycleCount = async (req: AuthRequest, res: Response) => {
  const count = await prisma.cycleCount.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      warehouse: { select: { name: true } },
      items: { include: { sku: { select: { skuCode: true, name: true, category: true } } } },
    },
  });
  if (!count) return res.status(404).json({ message: 'Cycle count not found' });
  res.json(count);
};

export const createCycleCount = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { warehouseId, notes } = req.body;

  const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
  if (!warehouse) return res.status(400).json({ message: 'Warehouse/facility not found' });

  const inventoryItems = await prisma.inventory.findMany({
    where: { warehouseId, quantityOnHand: { gt: 0 } },
    include: { sku: true },
  });

  if (!inventoryItems.length) return res.status(400).json({ message: 'No inventory to count in this facility' });

  const count = await prisma.cycleCount.create({
    data: {
      tenantId,
      warehouseId,
      status: 'IN_PROGRESS',
      startedBy: req.user!.id,
      startedAt: new Date(),
      notes,
      items: {
        create: inventoryItems.map(inv => ({
          skuId: inv.skuId,
          binLocation: inv.binLocation,
          expectedQty: inv.quantityOnHand,
          status: 'PENDING',
        })),
      },
    },
    include: {
      warehouse: { select: { name: true } },
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
    },
  });

  res.status(201).json(count);
};

export const updateCountItem = async (req: AuthRequest, res: Response) => {
  const { cycleCountId, skuId, countedQty } = req.body;
  const tenantId = req.user!.tenant_id;

  const count = await prisma.cycleCount.findFirst({ where: { id: cycleCountId, tenantId } });
  if (!count) return res.status(404).json({ message: 'Cycle count not found' });
  if (count.status !== 'IN_PROGRESS') return res.status(400).json({ message: 'Count is not in progress' });

  const item = await prisma.cycleCountItem.findUnique({ where: { cycleCountId_skuId: { cycleCountId, skuId } } });
  if (!item) return res.status(404).json({ message: 'Item not found in this count' });

  const variance = countedQty - item.expectedQty;

  const updated = await prisma.cycleCountItem.update({
    where: { cycleCountId_skuId: { cycleCountId, skuId } },
    data: { countedQty, variance, status: 'COUNTED' },
    include: { sku: { select: { skuCode: true, name: true } } },
  });

  await logProductivity({
    tenantId,
    warehouseId: count.warehouseId,
    userId: req.user!.id,
    activity: 'CYCLE_COUNT',
    entityType: 'CycleCountItem',
    entityId: updated.id,
    quantity: 1,
    durationMin: durationMinutes(count.startedAt, new Date()),
  });

  res.json(updated);
};

export const completeCycleCount = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const count = await prisma.cycleCount.findFirst({
    where: { id: req.params.id as string, tenantId },
    include: { items: true },
  }) as any;
  if (!count) return res.status(404).json({ message: 'Cycle count not found' });
  if (count.status !== 'IN_PROGRESS') return res.status(400).json({ message: 'Count is not in progress' });

  const pendingItems = count.items.filter(i => i.status === 'PENDING');
  if (pendingItems.length > 0) return res.status(400).json({ message: `${pendingItems.length} items still need counting` });

  await prisma.cycleCount.update({
    where: { id: count.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  for (const item of count.items) {
    if (item.countedQty != null && item.countedQty !== item.expectedQty) {
      const diff = item.countedQty - item.expectedQty;
      await prisma.inventory.updateMany({
        where: { warehouseId: count.warehouseId, skuId: item.skuId },
        data: {
          quantityOnHand: { increment: diff },
          quantityAvailable: { increment: diff },
        },
      });
    }
  }

  res.json({ message: 'Cycle count completed and inventory adjusted' });
};

export const cancelCycleCount = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const count = await prisma.cycleCount.findFirst({ where: { id: req.params.id as string, tenantId } });
  if (!count) return res.status(404).json({ message: 'Cycle count not found' });
  if (count.status !== 'IN_PROGRESS' && count.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Cannot cancel this count' });
  }
  await prisma.cycleCount.update({ where: { id: count.id }, data: { status: 'CANCELLED' } });
  res.json({ message: 'Cycle count cancelled' });
};
