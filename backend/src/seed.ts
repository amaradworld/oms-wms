import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding process...');

  await prisma.stockTransfer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rto.deleteMany();
  await prisma.return.deleteMany();
  await prisma.courierTracking.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.skuMaster.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  const tenantsData = [
    { id: 'tenant-1', name: 'InfiStyles', slug: 'infi' },
    { id: 'tenant-2', name: 'Aria Fashion', slug: 'aria' },
    { id: 'tenant-3', name: 'ZenCart', slug: 'zencart' },
    { id: 'tenant-4', name: 'PrimeWear', slug: 'primewear' },
    { id: 'tenant-5', name: 'EcoThreads', slug: 'ecothreads' },
  ];

  for (const t of tenantsData) {
    await prisma.tenant.create({ data: t });
  }

  const admin = await prisma.user.create({
    data: {
      tenantId: 'tenant-1',
      email: 'admin@oms.com',
      passwordHash,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  const ownerPasswordHash = await bcrypt.hash('owner123', 10);
  await prisma.user.create({
    data: {
      tenantId: null,
      email: 'owner@supplyhub.com',
      passwordHash: ownerPasswordHash,
      fullName: 'Platform Owner',
      role: 'PLATFORM_ADMIN',
    },
  });

  const tenantUsers = [
    { tenantId: 'tenant-2', email: 'admin@aria.com', fullName: 'Aria Admin' },
    { tenantId: 'tenant-3', email: 'admin@zencart.com', fullName: 'ZenCart Admin' },
    { tenantId: 'tenant-4', email: 'admin@primewear.com', fullName: 'PrimeWear Admin' },
    { tenantId: 'tenant-5', email: 'admin@ecothreads.com', fullName: 'EcoThreads Admin' },
  ];

  for (const u of tenantUsers) {
    await prisma.user.create({
      data: {
        tenantId: u.tenantId,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: 'SUPER_ADMIN',
      },
    });
  }

  const mumbaiWh = await prisma.warehouse.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Mumbai Central Hub',
      location: 'Mumbai',
      address: 'Andheri East, Mumbai, MH',
    },
  });

  const delhiWh = await prisma.warehouse.create({
    data: {
      tenantId: 'tenant-1',
      name: 'Delhi Logistics Park',
      location: 'Delhi',
      address: 'Okhla Phase III, Delhi',
    },
  });

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

  const orderSources = ['Shopify', 'Amazon', 'Flipkart', 'Meesho'];
  const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];

  for (let i = 1; i <= 50; i++) {
    const source = orderSources[Math.floor(Math.random() * orderSources.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

    const order = await prisma.order.create({
      data: {
        tenantId: 'tenant-1',
        orderNumber: `ORD-${1000 + i}`,
        source,
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

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
