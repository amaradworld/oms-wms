import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
};

export const exportOrders = async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { tenantId: req.user!.tenant_id },
    include: { items: { include: { sku: true } }, warehouse: { select: { name: true } } },
  });
  const rows = orders.map(o => ({
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    orderStatus: o.orderStatus,
    source: o.source || '',
    warehouse: o.warehouse?.name || '',
    paymentStatus: o.paymentStatus || '',
    createdAt: o.createdAt.toISOString(),
    items: o.items.map(i => `${i.sku.skuCode} x${i.quantity}`).join('; '),
    totalAmount: o.items.reduce((s, i) => s + Number(i.totalAmount), 0),
  }));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
  res.send(toCsv(rows));
};

export const exportInventory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const items = await prisma.inventory.findMany({
    where: { warehouse: { tenantId } },
    include: { sku: true, warehouse: true },
  });
  const rows = items.map(i => ({
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    category: i.sku.category || '',
    warehouse: i.warehouse.name,
    binLocation: i.binLocation || '',
    quantityOnHand: i.quantityOnHand,
    quantityAvailable: i.quantityAvailable,
  }));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
  res.send(toCsv(rows));
};
