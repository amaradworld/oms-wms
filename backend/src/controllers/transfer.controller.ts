import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getTransfers = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const transfers = await prisma.stockTransfer.findMany({
    where: { tenantId },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transfers);
};

export const createTransfer = async (req: AuthRequest, res: Response) => {
  const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
  const transfer = await prisma.stockTransfer.create({
    data: {
      tenantId: req.user!.tenant_id, fromWarehouseId, toWarehouseId, notes,
      items: { create: items.map(i => ({ skuId: i.skuId, quantity: i.quantity })) },
    },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  res.status(201).json(transfer);
};

export const completeTransfer = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;
  const transfer: any = await prisma.stockTransfer.findFirst({ where: { id, tenantId }, include: { items: true } });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

  for (const item of transfer.items) {
    const fromInv = await prisma.inventory.findFirst({ where: { warehouseId: transfer.fromWarehouseId, skuId: item.skuId } });
    if (!fromInv || fromInv.quantityAvailable < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${item.skuId}` });
    }
    await prisma.inventory.update({ where: { id: fromInv.id }, data: { quantityOnHand: { decrement: item.quantity }, quantityAvailable: { decrement: item.quantity } } });
    await prisma.inventory.upsert({
      where: { warehouseId_skuId_binLocation: { warehouseId: transfer.toWarehouseId, skuId: item.skuId, binLocation: 'TRANSFERRED' } },
      update: { quantityOnHand: { increment: item.quantity }, quantityAvailable: { increment: item.quantity } },
      create: { warehouseId: transfer.toWarehouseId, skuId: item.skuId, binLocation: 'TRANSFERRED', quantityOnHand: item.quantity, quantityAvailable: item.quantity },
    });
    await prisma.stockTransferItem.update({ where: { id: item.id }, data: { status: 'TRANSFERRED' } });
  }
  await prisma.stockTransfer.update({ where: { id }, data: { status: 'COMPLETED' } });
  res.json({ message: 'Transfer completed' });
};
