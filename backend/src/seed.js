const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding process...');

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "audit_logs" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "rto" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "returns" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "courier_tracking" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "order_items" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "inventory" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "sku_master" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "marketplace_order_mappings" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "marketplace_configs" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "warehouses" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');

  // Create User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      tenantId: 'tenant-1',
      email: 'admin@oms.com',
      passwordHash,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created admin user (password: admin123)');

  // Create Warehouses
  const mumbaiWh = await prisma.warehouse.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Mumbai Central Hub',
      location: 'Mumbai',
    },
  });
  const delhiWh = await prisma.warehouse.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Delhi Logistics Park',
      location: 'Delhi',
    },
  });
  // Create Facilities under Mumbai WH
  const mumbaiS1 = await prisma.warehouse.create({
    data: { tenantId: 'tenant-1', name: 'Mumbai - Section A (Apparel)', location: 'Mumbai', parentId: mumbaiWh.id },
  });
  const mumbaiS2 = await prisma.warehouse.create({
    data: { tenantId: 'tenant-1', name: 'Mumbai - Section B (Footwear)', location: 'Mumbai', parentId: mumbaiWh.id },
  });
  const delhiS1 = await prisma.warehouse.create({
    data: { tenantId: 'tenant-1', name: 'Delhi - East Wing', location: 'Delhi', parentId: delhiWh.id },
  });
  console.log('Created 3 facilities');

  // Create SKUs
  const skusData = [
    { code: 'TSH-BLU-S', name: 'Blue Cotton T-Shirt (S)', cat: 'Apparel', hsn: '6109', wt: 0.2 },
    { code: 'TSH-BLU-M', name: 'Blue Cotton T-Shirt (M)', cat: 'Apparel', hsn: '6109', wt: 0.2 },
    { code: 'TSH-RED-L', name: 'Red Cotton T-Shirt (L)', cat: 'Apparel', hsn: '6109', wt: 0.2 },
    { code: 'JNS-BLK-32', name: 'Black Slim Fit Jeans (32)', cat: 'Apparel', hsn: '6203', wt: 0.6 },
    { code: 'SHK-WHT-10', name: 'White Sneakers (10)', cat: 'Footwear', hsn: '6403', wt: 1.1 },
    { code: 'JKT-BRW-L', name: 'Brown Leather Jacket (L)', cat: 'Outerwear', hsn: '4203', wt: 1.5 },
    { code: 'ACC-WLT-BRW', name: 'Brown Leather Wallet', cat: 'Accessories', hsn: '4201', wt: 0.1 },
    { code: 'ACC-BELT-BLK', name: 'Black Formal Belt', cat: 'Accessories', hsn: '4203', wt: 0.1 },
    { code: 'TSH-GRY-M', name: 'Grey V-Neck T-Shirt (M)', cat: 'Apparel', hsn: '6109', wt: 0.2 },
    { code: 'SHK-BLK-9', name: 'Black Running Shoes (9)', cat: 'Footwear', hsn: '6403', wt: 0.9 },
  ];

  const createdSkus = [];
  for (const sku of skusData) {
    const s = await prisma.skuMaster.create({
      data: { skuCode: sku.code, name: sku.name, category: sku.cat, hsnCode: sku.hsn, weight: sku.wt, tenantId: 'tenant-1' },
    });
    createdSkus.push(s);
  }
  console.log('Created 10 SKUs');

  // Create Inventory
  for (const sku of createdSkus) {
    await prisma.inventory.create({
      data: {
        warehouseId: mumbaiWh.id,
        skuId: sku.id,
        binLocation: `BIN-${Math.floor(Math.random() * 100)}`,
        quantityOnHand: Math.floor(Math.random() * 100) + 10,
        quantityAvailable: Math.floor(Math.random() * 100) + 10,
      },
    });
    await prisma.inventory.create({
      data: {
        warehouseId: delhiWh.id,
        skuId: sku.id,
        binLocation: `BIN-${Math.floor(Math.random() * 100)}`,
        quantityOnHand: Math.floor(Math.random() * 100) + 10,
        quantityAvailable: Math.floor(Math.random() * 100) + 10,
      },
    });
  }
  console.log('Created inventory data');

  // Create 50 Mock Orders
  const sources = ['Shopify', 'Amazon', 'Flipkart', 'Meesho'];
  const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];

  for (let i = 1; i <= 50; i++) {
    const src = sources[Math.floor(Math.random() * sources.length)];
    const st = statuses[Math.floor(Math.random() * statuses.length)];
    const d = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30);

    const order = await prisma.order.create({
      data: {
        tenantId: 'tenant-1',
        orderNumber: `ORD-${1000 + i}`,
        source: src,
        customerName: `Customer ${i}`,
        shippingAddress: `Address ${i}, City ${i}`,
        orderStatus: st,
        createdAt: d,
      },
    });

    const itemCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < itemCount; j++) {
      const sku = createdSkus[Math.floor(Math.random() * createdSkus.length)];
      const price = Math.floor(Math.random() * 2000) + 500;
      const qty = Math.floor(Math.random() * 2) + 1;
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          skuId: sku.id,
          quantity: qty,
          unitPrice: price,
          totalAmount: price * qty,
        },
      });
    }
  }
  console.log('Created 50 mock orders');

  // Create demo marketplace configs
  await prisma.marketplaceConfig.createMany({
    data: [
      { tenantId: 'tenant-1', marketplace: 'NYKAA', apiKey: 'demo', isActive: true, syncMessage: 'Ready to sync (demo mode)' },
      { tenantId: 'tenant-1', marketplace: 'MYNTRA', apiKey: 'demo', isActive: true, syncMessage: 'Ready to sync (demo mode)' },
      { tenantId: 'tenant-1', marketplace: 'TATACLIQ', apiKey: 'demo', isActive: true, syncMessage: 'Ready to sync (demo mode)' },
    ],
  });
  console.log('Created 3 marketplace configs (demo mode)');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
