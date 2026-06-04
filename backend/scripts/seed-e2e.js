require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tenantId = 'tenant-1';
  const whMum = await p.warehouse.findFirst({ where: { name: 'Mumbai Central Hub' } });
  const whDel = await p.warehouse.findFirst({ where: { name: 'Delhi Logistics Park' } });
  const whMumA = await p.warehouse.findFirst({ where: { name: 'Mumbai - Section A (Apparel)' } });
  const whMumB = await p.warehouse.findFirst({ where: { name: 'Mumbai - Section B (Footwear)' } });

  const skus = await p.skuMaster.findMany({ where: { tenantId } });
  const skuMap = Object.fromEntries(skus.map(s => [s.skuCode, s]));

  // 1. Bin Locations (Mumbai)
  const bins = ['BIN-A01','BIN-A02','BIN-A03','BIN-B01','BIN-B02','BIN-C01','BIN-D01','BIN-D02'];
  for (const code of bins) {
    await p.binLocation.upsert({
      where: { warehouseId_code: { warehouseId: whMum.id, code } },
      update: {},
      create: { tenantId, warehouseId: whMum.id, code, zone: code.startsWith('BIN-A')?'A':code.startsWith('BIN-B')?'B':'C', isActive: true },
    });
  }
  console.log('8 bin locations created');

  // 2. Supplier
  const supplier = await p.supplier.upsert({
    where: { tenantId_code: { tenantId, code: 'SUP-001' } },
    update: {},
    create: { tenantId, code: 'SUP-001', name: 'Fashion Supply Co.', contactPerson: 'Ramesh', email: 'ramesh@fashionsupply.in', phone: '9876543210', gstin: '27AAABC1234A1Z5', isActive: true },
  });
  console.log('Supplier created:', supplier.name);

  // 3. Purchase Order
  const po = await p.purchaseOrder.upsert({
    where: { poNumber: 'PO-2024-001' },
    update: {},
    create: {
      tenantId, poNumber: 'PO-2024-001', supplierId: supplier.id, warehouseId: whMum.id,
      status: 'APPROVED', notes: 'Q1 Apparel Stock',
      items: {
        create: [
          { skuId: skuMap['TSH-BLU-M'].id, quantity: 100, unitPrice: 399 },
          { skuId: skuMap['TSH-RED-L'].id, quantity: 80, unitPrice: 499 },
          { skuId: skuMap['JNS-BLK-32'].id, quantity: 60, unitPrice: 1299 },
          { skuId: skuMap['ACC-BELT-BLK'].id, quantity: 200, unitPrice: 299 },
        ],
      },
    },
    include: { items: true },
  });
  console.log('Purchase Order created:', po.poNumber, '-', po.items.length, 'items');

  // 4. Courier Config
  await p.courierConfig.upsert({
    where: { tenantId_courierName: { tenantId, courierName: 'Delhivery' } },
    update: {},
    create: { tenantId, courierName: 'Delhivery', isActive: true, priority: 1, pincodePrefixes: '*', speedTier: 'standard' },
  });
  await p.courierConfig.upsert({
    where: { tenantId_courierName: { tenantId, courierName: 'Blue Dart' } },
    update: {},
    create: { tenantId, courierName: 'Blue Dart', isActive: true, priority: 2, pincodePrefixes: '10,11,12,13,14', speedTier: 'express' },
  });
  console.log('2 courier configs created');

  // 5. Create 3 fresh orders ready for picking (PENDING with Mumbai warehouse)
  for (let i = 0; i < 3; i++) {
    const order = await p.order.create({
      data: {
        tenantId, warehouseId: whMum.id, orderNumber: `E2E-ORD-${1001 + i}`,
        source: 'Shopify', customerName: `E2E Test Customer ${i+1}`,
        shippingAddress: `123 Test Street, Mumbai - 4000${i+1}`,
        orderStatus: 'PENDING', priority: 'HIGH',
        items: {
          create: [
            { skuId: skuMap['TSH-BLU-M'].id, quantity: 2, unitPrice: 599, totalAmount: 1198 },
            { skuId: skuMap['ACC-WLT-BRW'].id, quantity: 1, unitPrice: 1499, totalAmount: 1499 },
          ],
        },
      },
    });
    console.log('Test order created:', order.orderNumber);
  }

  // 6. Add on-hand stock to Mumbai for picking
  for (const skuCode of ['TSH-BLU-M', 'ACC-WLT-BRW', 'TSH-RED-L', 'JNS-BLK-32', 'ACC-BELT-BLK']) {
    const existing = await p.inventory.findFirst({ where: { warehouseId: whMum.id, skuId: skuMap[skuCode].id } });
    if (existing) {
      await p.inventory.update({ where: { id: existing.id }, data: { quantityOnHand: existing.quantityOnHand + 50, quantityAvailable: existing.quantityAvailable + 50 } });
    } else {
      await p.inventory.create({
        data: { warehouseId: whMum.id, skuId: skuMap[skuCode].id, binLocation: 'BIN-A01', quantityOnHand: 50, quantityAvailable: 50 },
      });
    }
  }
  console.log('Stock levels updated for picking');

  await p.$disconnect();
  console.log('\nE2E seed complete! Now open the app and follow the guide.');
}

main().catch(e => { console.error(e); process.exit(1); });
