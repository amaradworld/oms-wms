import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding process...');

  // 1. Clear existing data to avoid duplicates
  await prisma.auditLog.deleteMany();
  await prisma.rto.deleteMany();
  await prisma.returns.deleteMany();
  await prisma.courierTracking.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orders.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.skuMaster.deleteMany();
  await prisma.warehouses.deleteMany();
  await prisma.users.deleteMany();

  // 2. Create User (Admin)
  const admin = await prisma.user.create({
    data: {
      tenantId: 'tenant-1',
      email: 'admin@oms.com',
      passwordHash: 'hashed_password',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // 3. Create Warehouses
  const mumbaiWh = await prisma.warehouses.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Mumbai Central Hub',
      location: 'Mumbai',
      address: 'Andheri East, Mumbai, MH',
    },
  });

  const delhiWh = await prisma.warehouses.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Delhi Logistics Park',
      location: 'Delhi',
      address: 'Okhla Phase III, Delhi',
    },
  });

  // 4. Create SKUs
  const skus = [
    { skuCode: 'TSH-BLU-S', name: 'Blue Cotton T-Shirt (S)', category: 'Apparel', hsnCode: '6109', weight: 0.2 },
    { skuCode: 'TSH-BLU-M', name: 'Blue Cotton T-Shirt (M)', category: 'Apparel', hsnCode: '6109', weight: 0.2 },
    { skuCode: 'TSH-RED-L', name: 'Red Cotton T-Shirt (L)', category: 'Apparel', hsnCode: '6109', weight: 0.2 },
    { skuCode: 'JNS-BLK-32', name: 'Black Slim Fit Jeans (32)', category: 'Apparel', hsnCode: '6203', weight: 0.6 },
    { skuCode: 'SHK-WHT-10', name: 'White Sneakers (10)', category: 'Footwear', hsnCode: '6403', weight: 1.1 },
    { skuCode: 'JKT-BRW-L', name: 'Brown Leather Jacket (L)', category: 'Outerwear', hsnCode: '4203', weight: 1.5 },
    { skuCode: 'ACC-WLT-BRW', name: 'Brown Leather Wallet', category: 'Accessories', hsnCode: '4201', weight: 0.1 },
    { skuCode: 'ACC-BELT-BLK', name: 'Black Formal Belt', category: 'Accessories', hsnCode: '4203', weight: 0.1 },
    { skuCode: 'TSH-GRY-M', name: 'Grey V-Neck T-Shirt (M)', category: 'Apparel', hsnCode: '6109', weight: 0.2 },
    { skuCode: 'SHK-BLK-9', name: 'Black Running Shoes (9)', category: 'Footwear', hsnCode: '6403', weight: 0.9 },
  ];

  const createdSkus = [];
  for (const sku of skus) {
    const s = await prisma.skuMaster.create({
      data: { ...sku, tenantId: 'tenant-1' },
    });
    createdSkus.push(s);
  }

  // 5. Create Inventory
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

  // 6. Create Mock Orders
  const orderSources = ['Shopify', 'Amazon', 'Flipkart', 'Meesho'];
  const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];

  for (let i = 1; i <= 50; i++) {
    const source = orderSources[Math.floor(Math.random() * orderSources.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    
    const order = await prisma.orders.create({
      data: {
        tenantId: 'tenant-1',
        orderNumber: `ORD-${1000 + i}`,
        source: source,
        customerName: `Customer ${i}`,
        shippingAddress: `Address ${i}, City ${i}, State ${i}`,
        orderStatus: status,
        createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30),
      },
    });

    const itemsCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < itemsCount; j++) {
      const randomSku = createdSkus[Math.floor(Math.random() * createdSkus.length)];
      const price = Math.floor(Math.random() * 2000) + 500;
      const qty = Math.floor(Math.random() * 2) + 1;
      
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          skuId: randomSku.id,
          quantity: qty,
          unitPrice: price,
          totalAmount: price * qty,
        },
      });
    }
  }

  console.log('Seeding completed successfully! 🚀');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
