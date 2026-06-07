import prisma from '../services/prisma';

async function main() {
  console.log('[backfill-sla-history] starting...');
  const now = new Date();

  const ordersWithSla = await prisma.order.findMany({
    where: {
      slaDeadline: { not: null },
      orderStatus: { in: ['DELIVERED', 'DISPATCHED'] },
    },
    select: {
      id: true,
      orderStatus: true,
      slaDeadline: true,
      slaStatus: true,
      slaBreachedAt: true,
      deliveredAt: true,
      dispatchedAt: true,
      createdAt: true,
    },
  });

  let updatedMet = 0;
  let updatedBreached = 0;
  let backfilledDeadline = 0;

  for (const o of ordersWithSla) {
    if (!o.slaDeadline) continue;

    const closeTime = o.deliveredAt || o.dispatchedAt;
    if (!closeTime) continue;

    const met = closeTime <= o.slaDeadline;
    if (met) {
      if (o.slaStatus !== 'MET' && o.slaStatus !== 'CANCELLED') {
        await prisma.order.update({ where: { id: o.id }, data: { slaStatus: 'MET' } });
        updatedMet++;
      }
    } else {
      const breachAt = o.slaDeadline;
      if (o.slaStatus !== 'BREACHED') {
        await prisma.order.update({
          where: { id: o.id },
          data: { slaStatus: 'BREACHED', slaBreachedAt: o.slaBreachedAt || breachAt },
        });
        updatedBreached++;
      }
    }
  }

  const activeOrders = await prisma.order.findMany({
    where: {
      slaDeadline: { not: null },
      orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] },
    },
    select: { id: true, slaDeadline: true, slaStatus: true, slaBreachedAt: true },
  });

  for (const o of activeOrders) {
    if (!o.slaDeadline) continue;
    const minutesLeft = (o.slaDeadline.getTime() - now.getTime()) / 60000;
    let newStatus: string;
    if (minutesLeft < 0) {
      newStatus = 'BREACHED';
      if (!o.slaBreachedAt) {
        await prisma.order.update({
          where: { id: o.id },
          data: { slaStatus: 'BREACHED', slaBreachedAt: o.slaDeadline },
        });
        updatedBreached++;
        continue;
      }
    } else if (minutesLeft < 120) {
      newStatus = 'AT_RISK';
    } else {
      newStatus = 'ON_TRACK';
    }
    if (o.slaStatus !== newStatus) {
      await prisma.order.update({ where: { id: o.id }, data: { slaStatus: newStatus } });
    }
  }

  const oldOrders = await prisma.order.findMany({
    where: { slaDeadline: null, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
    select: { id: true, createdAt: true, source: true },
  });
  for (const o of oldOrders) {
    const hours = 48;
    const deadline = new Date(o.createdAt.getTime() + hours * 60 * 60 * 1000);
    await prisma.order.update({ where: { id: o.id }, data: { slaDeadline: deadline, slaStatus: deadline < now ? 'BREACHED' : 'ON_TRACK' } });
    backfilledDeadline++;
  }

  console.log(`[backfill-sla-history] done: met=${updatedMet} breached=${updatedBreached} backfilledDeadlines=${backfilledDeadline}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[backfill-sla-history] failed:', err);
    process.exit(1);
  });
