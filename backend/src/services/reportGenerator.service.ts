import prisma from './prisma';

type ReportType = 'GRN' | 'ORDER' | 'STOCK_TRANSFER' | 'INVENTORY_SNAPSHOT' | 'DISPATCH_MANIFEST';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  GRN: 'GRN',
  ORDER: 'Orders',
  STOCK_TRANSFER: 'StockTransfer',
  INVENTORY_SNAPSHOT: 'InventorySnapshot',
  DISPATCH_MANIFEST: 'DispatchManifest',
};

function getHourWindow(date: Date): { start: Date; end: Date; period: Date } {
  const start = new Date(date);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end, period: start };
}

function formatFileName(type: ReportType, period: Date): string {
  const d = period.toISOString().slice(0, 10);
  const h = String(period.getHours()).padStart(2, '0');
  return `${REPORT_TYPE_LABELS[type]}_${d}_${h}.csv`;
}

function escapeCsvField(value: any): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map(row => row.map(escapeCsvField).join(','));
  return [headerLine, ...dataLines].join('\n');
}

async function generateGrnReport(tenantId: string, start: Date, end: Date): Promise<string> {
  const grns = await prisma.grn.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    include: {
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
      purchaseOrder: { select: { poNumber: true, supplier: { select: { name: true } } } },
      warehouse: { select: { name: true } },
    },
  });

  const headers = [
    'GRN#', 'PO#', 'Supplier', 'Warehouse', 'Status',
    'SKU', 'Item Name', 'Expected Qty', 'Received Qty', 'Accepted Qty', 'Rejected Qty',
    'Batch', 'MRP', 'Expiry', 'QC Status', 'Created At',
  ];

  const rows = grns.flatMap(grn =>
    grn.items.map(item => [
      grn.grnNumber,
      grn.purchaseOrder?.poNumber,
      grn.purchaseOrder?.supplier?.name,
      grn.warehouse?.name,
      grn.status,
      item.sku?.skuCode,
      item.sku?.name,
      item.expectedQty,
      item.receivedQty,
      item.acceptedQty,
      item.rejectedQty,
      item.batchNo,
      item.mrp,
      item.expiryDate?.toISOString(),
      item.qcStatus,
      grn.createdAt.toISOString(),
    ])
  );

  return toCsv(headers, rows);
}

async function generateOrderReport(tenantId: string, start: Date, end: Date): Promise<string> {
  const orders = await prisma.order.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    include: {
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
      warehouse: { select: { name: true } },
    },
  });

  const headers = [
    'Order#', 'Customer', 'Source', 'Warehouse', 'Status', 'Payment Status',
    'SLA Status', 'SLA Deadline', 'Items (SKU:Qty)', 'Order Amount',
    'Dispatched At', 'Delivered At', 'Created At',
  ];

  const rows = orders.map(order => [
    order.orderNumber,
    order.customerName,
    order.source,
    order.warehouse?.name,
    order.orderStatus,
    order.paymentStatus,
    order.slaStatus,
    order.slaDeadline?.toISOString(),
    order.items.map(i => `${i.sku?.skuCode}:${i.quantity}`).join('; '),
    order.orderAmount,
    order.dispatchedAt?.toISOString(),
    order.deliveredAt?.toISOString(),
    order.createdAt.toISOString(),
  ]);

  return toCsv(headers, rows);
}

async function generateStockTransferReport(tenantId: string, start: Date, end: Date): Promise<string> {
  const transfers = await prisma.stockTransfer.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
    },
  });

  const headers = [
    'Transfer#', 'From Warehouse', 'To Warehouse', 'Status',
    'SKU', 'Item Name', 'Qty', 'Received Qty', 'Created At', 'Received At',
  ];

  const rows = transfers.flatMap(t =>
    t.items.map(item => [
      t.id.slice(0, 8).toUpperCase(),
      t.fromWarehouse?.name,
      t.toWarehouse?.name,
      t.status,
      item.sku?.skuCode,
      item.sku?.name,
      item.quantity,
      item.receivedQty,
      t.createdAt.toISOString(),
      t.receivedAt?.toISOString(),
    ])
  );

  return toCsv(headers, rows);
}

async function generateInventorySnapshotReport(tenantId: string): Promise<string> {
  const inventory = await prisma.inventory.findMany({
    where: { warehouse: { tenantId } },
    include: {
      warehouse: { select: { name: true } },
      sku: { select: { skuCode: true, name: true } },
    },
  });

  const headers = [
    'Warehouse', 'Bin', 'SKU', 'Item Name', 'Qty On Hand',
    'Qty Available', 'Qty Reserved', 'Batch', 'Status', 'Last Updated',
  ];

  const rows = inventory.map(inv => [
    inv.warehouse?.name,
    inv.binLocation,
    inv.sku?.skuCode,
    inv.sku?.name,
    inv.quantityOnHand,
    inv.quantityAvailable,
    inv.quantityReserved,
    inv.batch,
    inv.status,
    inv.lastUpdated?.toISOString(),
  ]);

  return toCsv(headers, rows);
}

async function generateDispatchManifestReport(tenantId: string, start: Date, end: Date): Promise<string> {
  const manifests = await prisma.manifest.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    include: {
      shipments: { include: { order: { select: { orderNumber: true } } } },
    },
  });

  const headers = [
    'Manifest#', 'Courier', 'Status', 'Total Shipments',
    'AWB Numbers', 'Order Numbers', 'Closed At', 'Created At',
  ];

  const rows = manifests.map(m => [
    m.manifestNumber,
    m.courierName,
    m.status,
    m.totalShipments,
    m.shipments.map(s => s.awbNumber).filter(Boolean).join('; '),
    m.shipments.map(s => s.order?.orderNumber).filter(Boolean).join('; '),
    m.closedAt?.toISOString(),
    m.createdAt.toISOString(),
  ]);

  return toCsv(headers, rows);
}

export async function generateHourlyReports(tenantId: string, now: Date = new Date()): Promise<void> {
  const { start, end, period } = getHourWindow(now);

  const generators: [ReportType, () => Promise<string>][] = [
    ['GRN', () => generateGrnReport(tenantId, start, end)],
    ['ORDER', () => generateOrderReport(tenantId, start, end)],
    ['STOCK_TRANSFER', () => generateStockTransferReport(tenantId, start, end)],
    ['INVENTORY_SNAPSHOT', () => generateInventorySnapshotReport(tenantId)],
    ['DISPATCH_MANIFEST', () => generateDispatchManifestReport(tenantId, start, end)],
  ];

  for (const [type, generate] of generators) {
    try {
      const csv = await generate();
      const fileData = Buffer.from(csv, 'utf-8');
      const fileName = formatFileName(type, period);

      await prisma.report.upsert({
        where: { tenantId_reportType_period: { tenantId, reportType: type, period } },
        update: { fileData, fileSize: fileData.length, fileName },
        create: { tenantId, reportType: type, period, fileName, fileData, fileSize: fileData.length },
      });
    } catch (err) {
      console.error(`[report-gen] tenant=${tenantId} type=${type} error:`, err);
    }
  }
}
