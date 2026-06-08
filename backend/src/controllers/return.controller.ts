import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getReturns = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const returns = await prisma.return.findMany({
    where: { order: { tenantId } },
    include: {
      order: { select: { orderNumber: true, customerName: true } },
      sku: { select: { skuCode: true, name: true } },
    },
    orderBy: { receivedAt: 'desc' },
  });
  res.json(returns);
};

export const createReturn = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { orderId, skuId, quantity, reason } = req.body;

  if (!orderId || !skuId || !quantity) {
    return res.status(400).json({ message: 'orderId, skuId, and quantity are required' });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const sku = await prisma.skuMaster.findFirst({
    where: { id: skuId, tenantId },
  });
  if (!sku) return res.status(404).json({ message: 'SKU not found' });

  const ret = await prisma.return.create({
    data: {
      orderId,
      skuId,
      quantity: parseInt(quantity),
      reason: reason || null,
      status: 'REQUESTED',
    },
    include: {
      order: { select: { orderNumber: true, customerName: true } },
      sku: { select: { skuCode: true, name: true } },
    },
  });

  res.status(201).json(ret);
};

export const updateReturnStatus = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const id = req.params.id as string;
  const { status, notes } = req.body;

  const validStatuses = ['REQUESTED', 'RECEIVED', 'QC_PASSED', 'QC_FAILED', 'RESTOCKED', 'DISPOSED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const existing = await prisma.return.findFirst({
    where: { id, order: { tenantId } },
  });
  if (!existing) return res.status(404).json({ message: 'Return not found' });

  const data: any = { status };
  if (status === 'RECEIVED') data.receivedAt = new Date();
  if (notes) data.reason = notes;

  const ret = await prisma.return.update({
    where: { id },
    data,
    include: {
      order: { select: { orderNumber: true, customerName: true, warehouseId: true } },
      sku: { select: { skuCode: true, name: true } },
    },
  });

  // On RESTOCKED: add returned items back to inventory
  if (status === 'RESTOCKED' && ret.order?.warehouseId) {
    const qty = existing.quantity;
    await prisma.inventory.upsert({
      where: {
        warehouseId_skuId_binLocation: {
          warehouseId: ret.order.warehouseId,
          skuId: existing.skuId,
          binLocation: 'QC-PASS',
        },
      },
      update: { quantityOnHand: { increment: qty }, quantityAvailable: { increment: qty } },
      create: {
        warehouseId: ret.order.warehouseId,
        skuId: existing.skuId,
        binLocation: 'QC-PASS',
        quantityOnHand: qty,
        quantityAvailable: qty,
        virtualInventory: 0,
        notFound: 0,
        type: 'Good',
        status: 'ACTIVE',
        inventoryAllocation: true,
        inventorySync: true,
        skuMixing: true,
        shelfOnHold: false,
      },
    });
  }

  res.json(ret);
};

export const deleteReturn = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const id = req.params.id as string;

  const existing = await prisma.return.findFirst({
    where: { id, order: { tenantId } },
  });
  if (!existing) return res.status(404).json({ message: 'Return not found' });

  await prisma.return.delete({ where: { id } });
  res.json({ message: 'Return deleted' });
};
