import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ where: { tenantId: req.user!.tenant_id }, orderBy: { createdAt: 'desc' } });
  res.json(suppliers);
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
  const { name, contactPerson, email, phone, address } = req.body;
  const supplier = await prisma.supplier.create({ data: { tenantId: req.user!.tenant_id, name, contactPerson, email, phone, address } });
  res.status(201).json(supplier);
};

export const getPurchaseOrders = async (req: AuthRequest, res: Response) => {
  const where: any = { tenantId: req.user!.tenant_id };
  const warehouseId = req.query.warehouseId as string;
  if (warehouseId) where.warehouseId = warehouseId;

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(pos);
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
  const { supplierId, warehouseId, expectedDate, notes, items } = req.body;
  const tenantId = req.user!.tenant_id;
  const count = await prisma.purchaseOrder.count({ where: { tenantId } });
  const poNumber = `PO-${String(count + 1).padStart(5, '0')}`;

  const skus = await prisma.skuMaster.findMany({
    where: { skuCode: { in: items.map(i => i.skuCode) }, tenantId },
  });
  const skuMap = new Map(skus.map(s => [s.skuCode, s.id]));
  const missing = items.filter(i => !skuMap.has(i.skuCode));
  if (missing.length) return res.status(400).json({ message: `SKU not found: ${missing.map(i => i.skuCode).join(', ')}` });

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId, poNumber, supplierId, warehouseId, expectedDate: expectedDate ? new Date(expectedDate) : null, notes,
      items: { create: items.map(i => ({ skuId: skuMap.get(i.skuCode)!, quantity: i.quantity, unitPrice: i.unitPrice || 0 })) },
    },
    include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  res.status(201).json(po);
};

export const receivePurchaseOrder = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const po: any = await prisma.purchaseOrder.findFirst({ where: { id, tenantId: req.user!.tenant_id }, include: { items: true } });
  if (!po) return res.status(404).json({ message: 'PO not found' });

  for (const item of po.items) {
    await prisma.inventory.upsert({
      where: { warehouseId_skuId_binLocation: { warehouseId: po.warehouseId, skuId: item.skuId, binLocation: 'RECEIVED' } },
      update: { quantityOnHand: { increment: item.quantity }, quantityAvailable: { increment: item.quantity } },
      create: { warehouseId: po.warehouseId, skuId: item.skuId, binLocation: 'RECEIVED', quantityOnHand: item.quantity, quantityAvailable: item.quantity },
    });
    await prisma.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: item.quantity, status: 'RECEIVED' } });
  }
  await prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED' } });
  res.json({ message: 'PO received, inventory updated' });
};

export const getReorderAlerts = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const all = await prisma.inventory.findMany({
    where: { warehouse: { tenantId } },
    include: { sku: { select: { skuCode: true, name: true } }, warehouse: { select: { name: true } } },
  });
  const items = all.filter(i => i.quantityAvailable <= i.reorderPoint).sort((a, b) => a.quantityAvailable - b.quantityAvailable);
  res.json(items);
};

export const updateReorderPoint = async (req: AuthRequest, res: Response) => {
  const { id, reorderPoint } = req.body;
  await prisma.inventory.update({ where: { id }, data: { reorderPoint } });
  res.json({ message: 'Reorder point updated' });
};
