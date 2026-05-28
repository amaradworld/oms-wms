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

export const getTransfer = async (req: AuthRequest, res: Response) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  res.json(transfer);
};

export const createTransfer = async (req: AuthRequest, res: Response) => {
  const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!items || items.length === 0) return res.status(400).json({ message: 'At least one item is required' });

  const skus = await prisma.skuMaster.findMany({
    where: { skuCode: { in: items.map(i => i.skuCode) }, tenantId },
  });
  const skuMap = new Map(skus.map(s => [s.skuCode, s.id]));
  const missing = items.filter(i => !skuMap.has(i.skuCode));
  if (missing.length) return res.status(400).json({ message: `SKU not found: ${missing.map(i => i.skuCode).join(', ')}` });

  const transfer = await prisma.stockTransfer.create({
    data: {
      tenantId, fromWarehouseId, toWarehouseId, notes,
      createdBy: req.user!.id,
      items: { create: items.map(i => ({ skuId: skuMap.get(i.skuCode)!, quantity: i.quantity })) },
    },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  res.status(201).json(transfer);
};

export const scanTransferItem = async (req: AuthRequest, res: Response) => {
  const { skuCode } = req.body;
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;

  const transfer = await prisma.stockTransfer.findFirst({ where: { id, tenantId } });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'DRAFT') return res.status(400).json({ message: 'Transfer already completed' });

  if (req.user!.warehouseId !== transfer.toWarehouseId) {
    return res.status(403).json({ message: 'Only receiving facility users can scan items' });
  }

  const sku = await prisma.skuMaster.findFirst({ where: { skuCode, tenantId } });
  if (!sku) return res.status(404).json({ message: 'SKU not found' });

  const item = await prisma.stockTransferItem.findFirst({
    where: { transferId: id, skuId: sku.id },
  });
  if (!item) return res.status(404).json({ message: 'Item not in this transfer' });

  if (item.receivedQty >= item.quantity) return res.status(400).json({ message: `${skuCode} already fully scanned` });

  const newQty = item.receivedQty + 1;
  const newStatus = newQty >= item.quantity ? 'RECEIVED' : 'PARTIAL';

  const updated = await prisma.stockTransferItem.update({
    where: { id: item.id },
    data: { receivedQty: newQty, status: newStatus },
    include: { sku: { select: { skuCode: true, name: true } } },
  });

  // Also update inventory for receiving warehouse
  await prisma.inventory.upsert({
    where: {
      warehouseId_skuId_binLocation: {
        warehouseId: transfer.toWarehouseId,
        skuId: sku.id,
        binLocation: '',
      },
    },
    update: {
      quantityOnHand: { increment: 1 },
      quantityAvailable: { increment: 1 },
    },
    create: {
      warehouseId: transfer.toWarehouseId,
      skuId: sku.id,
      binLocation: '',
      quantityOnHand: 1,
      quantityAvailable: 1,
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

  res.json(updated);
};

export const completeTransfer = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;

  const transfer: any = await prisma.stockTransfer.findFirst({ where: { id, tenantId }, include: { items: { include: { sku: { select: { skuCode: true } } } } } });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

  if (transfer.status !== 'DRAFT') return res.status(400).json({ message: 'Already completed' });

  if (req.user!.warehouseId !== transfer.toWarehouseId) {
    return res.status(403).json({ message: 'Only receiving facility users can complete transfers' });
  }

  const unscanned = transfer.items.filter(i => i.status !== 'RECEIVED');
  if (unscanned.length) {
    return res.status(400).json({ message: `Scan all items first. Unscanned: ${unscanned.map(i => i.sku?.skuCode).join(', ')}` });
  }

  for (const item of transfer.items) {
    const fromInv = await prisma.inventory.findFirst({ where: { warehouseId: transfer.fromWarehouseId, skuId: item.skuId } });
    if (!fromInv || fromInv.quantityAvailable < item.receivedQty) {
      return res.status(400).json({ message: `Insufficient stock for ${item.sku?.skuCode}` });
    }
    await prisma.inventory.update({ where: { id: fromInv.id }, data: { quantityOnHand: { decrement: item.receivedQty }, quantityAvailable: { decrement: item.receivedQty } } });
    await prisma.inventory.upsert({
      where: { warehouseId_skuId_binLocation: { warehouseId: transfer.toWarehouseId, skuId: item.skuId, binLocation: 'TRANSFERRED' } },
      update: { quantityOnHand: { increment: item.receivedQty }, quantityAvailable: { increment: item.receivedQty } },
      create: { warehouseId: transfer.toWarehouseId, skuId: item.skuId, binLocation: 'TRANSFERRED', quantityOnHand: item.receivedQty, quantityAvailable: item.receivedQty },
    });
  }
  await prisma.stockTransfer.update({
    where: { id },
    data: { status: 'COMPLETED', receivedBy: req.user!.id, receivedAt: new Date() },
  });
  res.json({ message: 'Transfer completed' });
};
