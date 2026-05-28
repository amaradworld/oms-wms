import prisma from '../services/prisma';

const DEFAULT_SLA_HOURS = 48;

async function main() {
  console.log('Backfilling SLA deadlines for existing orders...');

  const result = await prisma.order.updateMany({
    where: {
      slaDeadline: null,
      orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] },
    },
    data: {
      slaDeadline: new Date(Date.now() + DEFAULT_SLA_HOURS * 60 * 60 * 1000),
    },
  });

  console.log(`Updated ${result.count} orders with a ${DEFAULT_SLA_HOURS}h SLA deadline from now.`);
}

main()
  .catch((e) => { console.error('Backfill failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
