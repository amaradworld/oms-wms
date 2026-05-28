import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

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

  await prisma.$transaction([
    prisma.pickWave.update({ where: { id }, data: { status: 'IN_PROGRESS' } }),
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

  if (orderItem.status === 'PICKED') { res.status(400).json({ message: `${skuCode} already picked` }); return; }

  if (orderItem.quantity <= 0) { res.status(400).json({ message: 'Invalid quantity' }); return; }

  const updatedItem = await prisma.orderItem.update({
    where: { id: orderItem.id },
    data: { status: 'PICKED' },
    include: { sku: { select: { skuCode: true, name: true } } },
  });

  // Check if all items in the order are picked
  const allItems = await prisma.orderItem.findMany({ where: { orderId } });
  const allPicked = allItems.every(i => i.status === 'PICKED');

  if (allPicked) {
    await prisma.pickWaveOrder.update({
      where: { id: pickOrder.id },
      data: { status: 'COMPLETED' },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: 'PACKING' },
    });
  } else {
    await prisma.pickWaveOrder.update({
      where: { id: pickOrder.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  res.json({ message: `Verified ${skuCode} ✓`, item: updatedItem, allPicked, orderStatus: allPicked ? 'PACKING' : 'PICKING' });
};

export const completeWave = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const wave = await prisma.pickWave.findUnique({
    where: { id },
    include: { orders: { select: { orderId: true } } },
  });
  if (!wave) return res.status(404).json({ message: 'Wave not found' });

  await prisma.$transaction([
    prisma.pickWave.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } }),
    prisma.order.updateMany({
      where: { id: { in: wave.orders.map(o => o.orderId) } },
      data: { orderStatus: 'PACKING' },
    }),
  ]);
  res.json({ message: 'Wave completed' });
};
