import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logProductivity, durationMinutes } from '../services/productivityLogger.service';
import { applyOrderStatus } from '../services/orderStage.service';

export const getWaves = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const warehouseId = req.query.warehouseId as string;
  const where: any = { tenantId };
  if (warehouseId) where.warehouseId = warehouseId;

  const waves = await prisma.pickWave.findMany({
    where,
    include: {
      warehouse: { select: { name: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(waves);
};

export const createWave = async (req: AuthRequest, res: Response) => {
  const { warehouseId, name, orderIds } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!warehouseId) {
    return res.status(400).json({ message: 'Warehouse ID is required' });
  }
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: 'At least one order is required' });
  }

  const wave = await prisma.$transaction(async (tx) => {
    const wave = await tx.pickWave.create({
      data: {
        tenantId, warehouseId, name: name || `Wave-${Date.now()}`,
        orders: { create: orderIds.map((oid: string) => ({ orderId: oid })) },
      },
      include: { _count: { select: { orders: true } } },
    });

    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { orderStatus: 'PROCESSING' },
    });

    return wave;
  });

  res.status(201).json(wave);
};

export const getWaveOrders = async (req: AuthRequest, res: Response) => {
  const wave = await prisma.pickWave.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      orders: {
        include: {
          order: {
            include: {
              items: { include: { sku: { select: { skuCode: true, name: true } } } },
              warehouse: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!wave) return res.status(404).json({ message: 'Wave not found' });
  res.json(wave);
};

export const startWave = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const wave = await prisma.pickWave.findUnique({
    where: { id },
    include: { orders: { select: { orderId: true } } },
  });
  if (!wave) return res.status(404).json({ message: 'Wave not found' });
  if (wave.status !== 'PENDING') return res.status(400).json({ message: 'Wave already started' });

  const now = new Date();
  await prisma.$transaction([
    prisma.pickWave.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: now,
        assignedTo: req.user!.id,
        assignedAt: now,
      },
    }),
    prisma.order.updateMany({
      where: { id: { in: wave.orders.map(o => o.orderId) } },
      data: { orderStatus: 'PICKING' },
    }),
  ]);
  res.json({ message: 'Wave started' });
};

export const scanWaveItem = async (req: AuthRequest, res: Response) => {
  const waveId = req.params.id as string;
  const { skuCode, orderId } = req.body;
  const tenantId = req.user!.tenant_id;

  const wave = await prisma.pickWave.findFirst({
    where: { id: waveId, tenantId },
    include: { orders: { where: { orderId }, include: { order: { include: { items: { include: { sku: true } } } } } } },
  });
  if (!wave) { res.status(404).json({ message: 'Wave not found' }); return; }
  if (wave.status !== 'IN_PROGRESS') { res.status(400).json({ message: 'Wave must be IN_PROGRESS to scan items' }); return; }

  const pickOrder = wave.orders[0];
  if (!pickOrder) { res.status(404).json({ message: 'Order not found in this wave' }); return; }

  const orderItem = pickOrder.order.items.find(i => i.sku.skuCode === skuCode);
  if (!orderItem) { res.status(400).json({ message: `SKU ${skuCode} is not in this order` }); return; }

  if (orderItem.status === 'PICKED') { res.status(400).json({ message: `${skuCode} already fully picked` }); return; }

  const updatedItem = await prisma.orderItem.update({
    where: { id: orderItem.id },
    data: { scannedQty: { increment: 1 } },
    include: { sku: { select: { skuCode: true, name: true } } },
  });

  // Auto-mark PICKED when scanned qty reaches order qty
  const nowFull = updatedItem.scannedQty >= orderItem.quantity;
  if (nowFull) {
    await prisma.orderItem.update({
      where: { id: orderItem.id },
      data: { status: 'PICKED' },
    });
    await logProductivity({
      tenantId,
      warehouseId: wave.warehouseId,
      userId: req.user!.id,
      activity: 'PICKING',
      entityType: 'OrderItem',
      entityId: orderItem.id,
      quantity: 1,
      durationMin: durationMinutes(wave.startedAt || wave.createdAt, new Date()),
    });
  }

  // Check if all items in the order are picked
  const allItems = await prisma.orderItem.findMany({ where: { orderId } });
  const allPicked = allItems.every(i => i.status === 'PICKED');

  if (allPicked) {
    await prisma.pickWaveOrder.update({
      where: { id: pickOrder.id },
      data: { status: 'COMPLETED' },
    });
    await applyOrderStatus(orderId, 'PACKING', 'PICKING');
  } else {
    await prisma.pickWaveOrder.update({
      where: { id: pickOrder.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  res.json({
    message: nowFull ? `${skuCode} fully picked ✓` : `${skuCode} scanned (${updatedItem.scannedQty}/${orderItem.quantity})`,
    item: updatedItem,
    allPicked,
    orderStatus: allPicked ? 'PACKING' : 'PICKING',
  });
};

export const confirmWaveOrder = async (req: AuthRequest, res: Response) => {
  const waveId = req.params.id as string;
  const { orderId } = req.body;
  const tenantId = req.user!.tenant_id;

  const wave = await prisma.pickWave.findFirst({
    where: { id: waveId, tenantId },
    include: { orders: { where: { orderId } } },
  });
  if (!wave) { res.status(404).json({ message: 'Wave not found' }); return; }
  if (wave.status !== 'IN_PROGRESS') { res.status(400).json({ message: 'Wave must be IN_PROGRESS to confirm' }); return; }

  const pickOrder = wave.orders[0];
  if (!pickOrder) { res.status(404).json({ message: 'Order not found in this wave' }); return; }

  // Mark all non-PICKED items as PICKED (short-pick confirmation)
  await prisma.orderItem.updateMany({
    where: { orderId, status: { not: 'PICKED' } },
    data: { status: 'PICKED' },
  });

  await prisma.pickWaveOrder.update({
    where: { id: pickOrder.id },
    data: { status: 'COMPLETED' },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: 'PACKING' },
  });
  await applyOrderStatus(orderId, 'PACKING', 'PICKING');

  res.json({ message: 'Order confirmed with short pick ✓' });
};

export const autoCreateWave = async (req: AuthRequest, res: Response) => {
  const { warehouseId, maxOrders, carrierName } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!warehouseId) return res.status(400).json({ message: 'warehouseId is required' });

  const max = Math.min(50, Math.max(1, maxOrders || 20));

  // Find PENDING/PROCESSING orders in this warehouse that are ready for picking
  const where: any = {
    tenantId,
    warehouseId,
    orderStatus: { in: ['PENDING', 'PROCESSING'] },
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      tracking: true,
    },
    orderBy: [{ slaDeadline: 'asc' }, { createdAt: 'asc' }],
    take: max,
  });

  if (orders.length === 0) {
    return res.status(400).json({ message: 'No eligible orders found for wave creation' });
  }

  // Group by carrier (if tracking exists) or by shipping zone (pincode prefix)
  const groups = new Map<string, string[]>();
  for (const order of orders) {
    const carrier = order.tracking?.courierName || carrierName || 'UNASSIGNED';
    const key = carrier;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order.id);
  }

  const createdWaves: any[] = [];
  for (const [carrier, orderIds] of groups) {
    const wave = await prisma.$transaction(async (tx) => {
      const w = await tx.pickWave.create({
        data: {
          tenantId,
          warehouseId,
          name: `Auto-${carrier}-${Date.now()}`,
          orders: { create: orderIds.map((oid: string) => ({ orderId: oid })) },
        },
        include: { _count: { select: { orders: true } } },
      });
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { orderStatus: 'PROCESSING' },
      });
      return w;
    });
    createdWaves.push(wave);
  }

  res.status(201).json({
    message: `Created ${createdWaves.length} wave(s) for ${orders.length} orders`,
    waves: createdWaves,
  });
};

export const completeWave = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const wave = await prisma.pickWave.findUnique({
    where: { id },
    include: { orders: { select: { orderId: true } } },
  });
  if (!wave) return res.status(404).json({ message: 'Wave not found' });

  const now = new Date();
  const duration = durationMinutes(wave.startedAt || wave.createdAt, now);
  await prisma.$transaction([
    prisma.pickWave.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } }),
    prisma.order.updateMany({
      where: { id: { in: wave.orders.map(o => o.orderId) } },
      data: { orderStatus: 'PACKING' },
    }),
  ]);
  await logProductivity({
    tenantId: wave.tenantId,
    warehouseId: wave.warehouseId,
    userId: req.user!.id,
    activity: 'WAVE',
    entityType: 'PickWave',
    entityId: wave.id,
    quantity: wave.orders.length,
    durationMin: duration,
  });
  res.json({ message: 'Wave completed' });
};
