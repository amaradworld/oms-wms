import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
};

const sendCsv = (res: Response, rows: Record<string, any>[], filename: string) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(toCsv(rows));
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
  sendCsv(res, rows, 'orders.csv');
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
    styleName: i.sku.styleName || '',
    size: i.sku.size || '',
    color: i.sku.color || '',
    brand: i.sku.brand || '',
    category: i.sku.category || '',
    warehouse: i.warehouse.name,
    binLocation: i.binLocation || '',
    quantityOnHand: i.quantityOnHand,
    quantityAvailable: i.quantityAvailable,
    reorderPoint: i.reorderPoint,
    lastUpdated: i.lastUpdated?.toISOString() || '',
  }));
  sendCsv(res, rows, 'inventory.csv');
};

export const exportInventoryAdded = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const items = await prisma.inventory.findMany({
    where: { warehouse: { tenantId }, quantityOnHand: { gt: 0 } },
    include: { sku: true, warehouse: true },
    orderBy: { lastUpdated: 'desc' },
  });
  const rows = items.map(i => ({
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    warehouse: i.warehouse.name,
    binLocation: i.binLocation || '',
    quantityOnHand: i.quantityOnHand,
    quantityAvailable: i.quantityAvailable,
    reorderPoint: i.reorderPoint,
    lastUpdated: i.lastUpdated?.toISOString() || '',
  }));
  sendCsv(res, rows, 'inventory-added.csv');
};

export const exportStockTransfers = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const transfers = await prisma.stockTransfer.findMany({
    where: { tenantId },
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rows = transfers.map(t => ({
    transferId: t.id.slice(0, 8),
    status: t.status,
    fromWarehouse: t.fromWarehouse?.name || '',
    toWarehouse: t.toWarehouse?.name || '',
    items: t.items.map(i => `${i.sku.skuCode} x${i.quantity}`).join('; '),
    createdAt: t.createdAt.toISOString(),
    receivedAt: t.receivedAt?.toISOString() || '',
  }));
  sendCsv(res, rows, 'stock-transfers.csv');
};

export const exportReturns = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const returns = await prisma.return.findMany({
    where: { order: { tenantId } },
    include: { order: true, sku: true },
  });
  const rows = returns.map(r => ({
    returnId: r.id.slice(0, 8),
    orderNumber: r.order.orderNumber || '',
    skuCode: r.sku.skuCode || '',
    quantity: r.quantity,
    status: r.status,
    reason: r.reason || '',
    receivedAt: r.receivedAt?.toISOString() || '',
  }));
  sendCsv(res, rows, 'returns.csv');
};

export const exportPurchaseOrders = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const pos = await prisma.purchaseOrder.findMany({
    where: { tenantId },
    include: {
      supplier: true,
      warehouse: { select: { name: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rows = pos.map(po => ({
    poNumber: po.poNumber || po.id.slice(0, 8),
    supplier: po.supplier?.name || '',
    warehouse: po.warehouse?.name || '',
    status: po.status,
    items: po.items.map(i => `${i.sku.skuCode} x${i.quantity}`).join('; '),
    totalAmount: po.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
    orderDate: po.orderDate?.toISOString() || '',
    expectedDate: po.expectedDate?.toISOString() || '',
    createdAt: po.createdAt.toISOString(),
  }));
  sendCsv(res, rows, 'purchase-orders.csv');
};

export const exportCycleCounts = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const counts = await prisma.cycleCount.findMany({
    where: { warehouse: { tenantId } },
    include: {
      warehouse: { select: { name: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rows = counts.flatMap(c =>
    c.items.map(item => ({
      countId: c.id.slice(0, 8),
      warehouse: c.warehouse?.name || '',
      status: c.status,
      skuCode: item.sku.skuCode,
      name: item.sku.name,
      binLocation: item.binLocation || '',
      expectedQty: item.expectedQty,
      countedQty: item.countedQty,
      variance: item.variance ?? (item.countedQty - item.expectedQty),
      itemStatus: item.status,
      completedAt: c.completedAt?.toISOString() || '',
    }))
  );
  sendCsv(res, rows, 'cycle-counts.csv');
};

export const exportPickWaves = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const waves = await prisma.pickWave.findMany({
    where: { warehouse: { tenantId } },
    include: {
      warehouse: { select: { name: true } },
      orders: { include: { order: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rows = waves.map(w => ({
    waveId: w.id.slice(0, 8),
    name: w.name,
    warehouse: w.warehouse?.name || '',
    status: w.status,
    orders: w.orders.map(o => o.order?.orderNumber || '').join('; '),
    createdAt: w.createdAt.toISOString(),
    completedAt: w.completedAt?.toISOString() || '',
  }));
  sendCsv(res, rows, 'pick-waves.csv');
};

export const exportAuditLogs = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    include: { user: { select: { email: true, fullName: true } } },
    orderBy: { timestamp: 'desc' },
  });
  const rows = logs.map(l => ({
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId || '',
    userEmail: l.user?.email || '',
    userName: l.user?.fullName || '',
    oldValue: l.oldValue ? JSON.stringify(l.oldValue) : '',
    newValue: l.newValue ? JSON.stringify(l.newValue) : '',
    timestamp: l.timestamp.toISOString(),
  }));
  sendCsv(res, rows, 'audit-logs.csv');
};
