import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { requireApiKey } from '../middlewares/apiKey.middleware';

const router = Router();

router.use(requireApiKey);

function requireTenantId(req: Request, res: Response): string | null {
  const tenantId = req.query.tenantId as string;
  if (!tenantId) {
    res.status(400).json({ message: 'tenantId query parameter is required for data access' });
    return null;
  }
  return tenantId;
}

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return 'No data';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
};

function detectFormat(req: Request): 'json' | 'csv' {
  if (req.query.format === 'csv') return 'csv';
  if (req.headers.accept?.includes('text/csv')) return 'csv';
  return 'json';
}

function dateFilter(req: Request): { gte?: Date; lte?: Date } {
  const filter: { gte?: Date; lte?: Date } = {};
  if (req.query.from) filter.gte = new Date(req.query.from as string);
  if (req.query.to) filter.lte = new Date(req.query.to as string);
  return filter;
}

function sendResponse(res: Response, format: 'json' | 'csv', data: Record<string, any>[], filename: string, total?: number) {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(toCsv(data));
  }
  if (total !== undefined) return res.json({ data, total });
  return res.json({ data });
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    endpoints: [
      '/api/v1/data/orders',
      '/api/v1/data/inventory',
      '/api/v1/data/grn',
      '/api/v1/data/putaway',
      '/api/v1/data/stock-transfers',
      '/api/v1/data/purchase-orders',
      '/api/v1/data/gatepasses',
      '/api/v1/data/returns',
      '/api/v1/data/skus',
      '/api/v1/data/bins',
      '/api/v1/data/suppliers',
      '/api/v1/data/integrations',
    ],
    auth: 'x-api-key header or ?api_key= query parameter',
    format: '?format=csv or Accept: text/csv header for CSV',
    filtering: '?from=2024-01-01&to=2024-12-31 (ISO dates)',
  });
});

router.get('/orders', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
  const where: any = { tenantId };
  if (df.gte || df.lte) where.createdAt = df;

  const [raw, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { sku: true } }, warehouse: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const rows = raw.map(o => ({
    orderNumber: o.orderNumber,
    displayOrderCode: o.displayOrderCode || '',
    customerName: o.customerName,
    customerCode: o.customerCode || '',
    customerGstin: o.customerGstin || '',
    notificationEmail: o.notificationEmail || '',
    notificationMobile: o.notificationMobile || '',
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus || '',
    paymentMode: o.paymentMode || '',
    source: o.source || '',
    warehouse: (o as any).warehouse?.name || '',
    currency: o.currency || 'INR',
    shippingAddress: o.shippingAddress,
    billingName: o.billingName || '',
    billingCity: o.billingCity || '',
    billingState: o.billingState || '',
    billingPinCode: o.billingPinCode || '',
    billingPhone: o.billingPhone || '',
    orderAmount: Number(o.orderAmount || 0),
    discountAmount: Number(o.discountAmount || 0),
    giftWrapCharges: Number(o.giftWrapCharges || 0),
    shippingCharges: Number(o.shippingCharges || 0),
    ewayBillNumber: o.ewayBillNumber || '',
    irn: o.irn || '',
    totalItems: o.items.reduce((s, i) => s + i.quantity, 0),
    itemDetails: o.items.map(i => `${i.sku.skuCode} x${i.quantity} @${i.unitPrice}`).join('; '),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  sendResponse(res, format, rows, 'orders.csv', total);
});

router.get('/inventory', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const warehouseId = req.query.warehouseId as string;
  const where: any = { warehouse: { tenantId } };
  if (warehouseId) where.warehouseId = warehouseId;

  const items = await prisma.inventory.findMany({
    where,
    include: { sku: true, warehouse: { select: { name: true } } },
    orderBy: [{ warehouseId: 'asc' }, { binLocation: 'asc' }],
  });

  const rows = items.map(i => ({
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    size: i.sku.size || '',
    color: i.sku.color || '',
    brand: i.sku.brand || '',
    category: i.sku.category || '',
    warehouse: (i as any).warehouse?.name || '',
    warehouseId: i.warehouseId,
    binLocation: i.binLocation || '',
    batch: i.batch || '',
    batchStatus: i.batchStatus || '',
    type: i.type || 'Good',
    quantityOnHand: i.quantityOnHand,
    quantityReserved: i.quantityReserved,
    quantityAvailable: i.quantityAvailable,
    reorderPoint: i.reorderPoint,
    lastUpdated: i.lastUpdated?.toISOString() || '',
  }));

  sendResponse(res, format, rows, 'inventory.csv');
});

router.get('/grn', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const where: any = { tenantId };
  if (df.gte || df.lte) where.createdAt = df;

  const grns = await prisma.grn.findMany({
    where,
    include: {
      warehouse: { select: { name: true } },
      purchaseOrder: { select: { poNumber: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = grns.flatMap(g =>
    g.items.map(item => ({
      grnNumber: g.grnNumber,
      poNumber: g.purchaseOrder?.poNumber || '',
      warehouse: (g as any).warehouse?.name || '',
      status: g.status,
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      expectedQty: item.expectedQty,
      receivedQty: item.receivedQty,
      acceptedQty: item.acceptedQty,
      rejectedQty: item.rejectedQty,
      qcStatus: item.qcStatus || 'PENDING',
      batchNo: item.batchNo || '',
      expiryDate: item.expiryDate?.toISOString() || '',
      createdAt: g.createdAt.toISOString(),
    }))
  );

  sendResponse(res, format, rows, 'grn.csv');
});

router.get('/putaway', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const status = req.query.status as string;
  const where: any = { warehouse: { tenantId } };
  if (status) where.status = status;

  const tasks = await prisma.putawayTask.findMany({
    where,
    include: {
      sku: true,
      bin: { select: { code: true } },
      grn: { select: { grnNumber: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = tasks.map(t => ({
    id: t.id,
    source: t.source,
    sourceId: t.sourceId || '',
    grnNumber: t.grn?.grnNumber || '',
    skuCode: t.sku.skuCode,
    skuName: t.sku.name,
    expectedQty: t.expectedQty,
    completedQty: t.completedQty || 0,
    binCode: t.bin?.code || '',
    warehouse: (t as any).warehouse?.name || '',
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt?.toISOString() || '',
  }));

  sendResponse(res, format, rows, 'putaway.csv');
});

router.get('/stock-transfers', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const where: any = { tenantId };
  if (df.gte || df.lte) where.createdAt = df;

  const transfers = await prisma.stockTransfer.findMany({
    where,
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = transfers.flatMap(t =>
    t.items.map(item => ({
      transferId: t.id.substring(0, 8),
      fromWarehouse: t.fromWarehouse?.name || '',
      toWarehouse: t.toWarehouse?.name || '',
      status: t.status,
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      quantity: item.quantity,
      receivedQty: item.receivedQty,
      notes: t.notes || '',
      createdAt: t.createdAt.toISOString(),
      receivedAt: t.receivedAt?.toISOString() || '',
    }))
  );

  sendResponse(res, format, rows, 'stock-transfers.csv');
});

router.get('/purchase-orders', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const where: any = { tenantId };
  if (df.gte || df.lte) where.createdAt = df;

  const pos = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: true,
      warehouse: { select: { name: true } },
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = pos.flatMap(po =>
    po.items.map(item => ({
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || '',
      supplierContact: po.supplier?.contactPerson || '',
      supplierEmail: po.supplier?.email || '',
      supplierPhone: po.supplier?.phone || '',
      warehouse: po.warehouse?.name || '',
      status: po.status,
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      orderedQty: item.quantity,
      receivedQty: item.receivedQty,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
      notes: po.notes || '',
      orderDate: po.orderDate?.toISOString() || '',
      expectedDate: po.expectedDate?.toISOString() || '',
      createdAt: po.createdAt.toISOString(),
    }))
  );

  sendResponse(res, format, rows, 'purchase-orders.csv');
});

router.get('/gatepasses', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const where: any = { tenantId };
  if (df.gte || df.lte) where.createdAt = df;

  const gatepasses = await prisma.gatepass.findMany({
    where,
    include: {
      items: { include: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = gatepasses.flatMap(g =>
    g.items.map(item => ({
      code: g.code,
      type: g.type,
      status: g.status,
      toParty: g.toParty || '',
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      quantity: item.quantity,
      scannedQty: item.scannedQty,
      inventoryType: item.inventoryType || '',
      shelfCode: item.shelfCode || '',
      unitPrice: Number(item.unitPrice || 0),
      batchCode: item.batchCode || '',
      forceAllocate: item.forceAllocate ? 'Yes' : 'No',
      expectedDate: g.expectedDate?.toISOString() || '',
      createdAt: g.createdAt.toISOString(),
    }))
  );

  sendResponse(res, format, rows, 'gatepasses.csv');
});

router.get('/returns', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const df = dateFilter(req);
  const where: any = { order: { tenantId } };
  if (df.gte || df.lte) where.receivedAt = df;

  const returns = await prisma.return.findMany({
    where,
    include: { order: true, sku: true },
    orderBy: { receivedAt: 'desc' },
  });

  const rows = returns.map(r => ({
    returnId: r.id.substring(0, 8),
    orderNumber: r.order?.orderNumber || '',
    skuCode: r.sku?.skuCode || '',
    skuName: r.sku?.name || '',
    quantity: r.quantity,
    status: r.status,
    reason: r.reason || '',
    receivedAt: r.receivedAt?.toISOString() || '',
  }));

  sendResponse(res, format, rows, 'returns.csv');
});

router.get('/skus', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const search = req.query.search as string;
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { skuCode: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skus = await prisma.skuMaster.findMany({
    where,
    orderBy: { skuCode: 'asc' },
  });

  const rows = skus.map(s => ({
    skuCode: s.skuCode,
    name: s.name,
    styleName: s.styleName || '',
    size: s.size || '',
    color: s.color || '',
    brand: s.brand || '',
    category: s.category || '',
    mrp: Number(s.mrp || 0),
    unitType: s.unitType || '',
    hsnCode: s.hsnCode || '',
    weight: Number(s.weight || 0),
    dimensions: s.dimensions || '',
    description: s.description || '',
  }));

  sendResponse(res, format, rows, 'skus.csv');
});

router.get('/bins', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);
  const warehouseId = req.query.warehouseId as string;
  const where: any = { warehouse: { tenantId } };
  if (warehouseId) where.warehouseId = warehouseId;

  const bins = await prisma.binLocation.findMany({
    where,
    include: { warehouse: { select: { name: true } } },
    orderBy: { code: 'asc' },
  });

  const rows = bins.map(b => ({
    code: b.code,
    warehouse: (b as any).warehouse?.name || '',
    zone: b.zone || '',
    aisle: b.aisle || '',
    rack: b.rack || '',
    shelf: b.shelf || '',
    isActive: b.isActive ? 'Yes' : 'No',
  }));

  sendResponse(res, format, rows, 'bins.csv');
});

router.get('/suppliers', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  const rows = suppliers.map(s => ({
    name: s.name,
    contactPerson: s.contactPerson || '',
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    isActive: s.isActive ? 'Yes' : 'No',
  }));

  sendResponse(res, format, rows, 'suppliers.csv');
});

router.get('/integrations', async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req, res);
  if (!tenantId) return;
  const format = detectFormat(req);

  const integrations = await prisma.platformIntegration.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  const rows = integrations.map(i => ({
    name: i.name,
    platform: i.platform,
    apiBaseUrl: i.apiBaseUrl || '',
    syncInventory: i.syncInventory ? 'Yes' : 'No',
    syncOrders: i.syncOrders ? 'Yes' : 'No',
    syncProducts: i.syncProducts ? 'Yes' : 'No',
    isActive: i.isActive ? 'Yes' : 'No',
    lastSyncAt: i.lastSyncAt?.toISOString() || '',
    createdAt: i.createdAt.toISOString(),
  }));

  sendResponse(res, format, rows, 'integrations.csv');
});

export default router;
