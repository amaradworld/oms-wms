require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tenantId = 'tenant-1';

  const supplier = await p.supplier.findFirst({ where: { tenantId } });
  if (!supplier) { console.log('No supplier found'); return; }

  const wh = await p.warehouse.findFirst({ where: { tenantId } });
  if (!wh) { console.log('No warehouse found'); return; }

  const skus = await p.skuMaster.findMany({ where: { tenantId }, take: 3 });
  if (skus.length === 0) { console.log('No SKUs found'); return; }

  const poCount = await p.purchaseOrder.count({ where: { tenantId } });
  const poNumber = `PO-TEST-${String(poCount + 1).padStart(4, '0')}`;

  const items = skus.map((sku, i) => ({
    skuId: sku.id,
    quantity: [50, 30, 20][i] || 20,
    unitPrice: 500,
  }));

  const po = await p.purchaseOrder.create({
    data: {
      tenantId,
      poNumber,
      supplierId: supplier.id,
      warehouseId: wh.id,
      status: 'APPROVED',
      totalQty: items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      items: { create: items.map(i => ({ skuId: i.skuId, quantity: i.quantity, unitPrice: i.unitPrice, receivedQty: 0 })) },
    },
    include: { items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });

  console.log(`PO created: ${po.poNumber}`);
  console.log(`Supplier: ${supplier.name}`);
  console.log(`Warehouse: ${wh.name}`);
  console.log('Items:');
  po.items.forEach(item => console.log(`  ${item.sku?.skuCode} (${item.sku?.name}) x ${item.quantity}`));

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
