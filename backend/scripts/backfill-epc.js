const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const skus = await prisma.skuMaster.findMany({ where: { epcCode: null }, orderBy: { createdAt: 'asc' } });
  if (!skus.length) { console.log('All SKUs already have EPC codes'); return; }

  const existingMax = await prisma.skuMaster.findFirst({
    where: { epcCode: { not: null } },
    orderBy: { epcCode: 'desc' },
    select: { epcCode: true },
  });

  let counter = 1;
  if (existingMax?.epcCode) {
    const num = parseInt(existingMax.epcCode, 10);
    if (!isNaN(num)) counter = num + 1;
  }

  for (const sku of skus) {
    const epc = String(10000000000 + counter); // 10000000001, 10000000002, ...
    await prisma.skuMaster.update({ where: { id: sku.id }, data: { epcCode: epc } });
    console.log(`${sku.skuCode} → ${epc}`);
    counter++;
  }
  console.log(`Done — ${skus.length} SKUs backfilled`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
