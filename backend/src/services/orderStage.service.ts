import prisma from './prisma';

const STAGE_FIELDS: Record<string, string> = {
  PICKING: 'pickedAt',
  PACKING: 'packedAt',
  SHIPPED: 'manifestedAt',
  DISPATCHED: 'dispatchedAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};

const NEXT_STAGE: Record<string, string> = {
  PENDING: 'firstResponseAt',
  PROCESSING: 'firstResponseAt',
  PICKING: 'pickedAt',
  PACKING: 'packedAt',
  SHIPPED: 'manifestedAt',
  DISPATCHED: 'dispatchedAt',
};

export async function buildOrderStatusUpdate(
  orderId: string,
  newStatus: string,
  prevStatus: string,
  sla: { deadline: Date | null; status: string | null } | null
) {
  const data: Record<string, any> = { orderStatus: newStatus };
  const now = new Date();

  if (prevStatus === 'PICKING' && newStatus === 'PACKING') {
    data.pickedAt = now;
  }
  if (prevStatus === 'PACKING' && newStatus === 'SHIPPED') {
    data.packedAt = now;
  }

  if (newStatus === 'SHIPPED' && !data.manifestedAt) data.manifestedAt = now;
  if (newStatus === 'DISPATCHED') data.dispatchedAt = now;
  if (newStatus === 'DELIVERED') data.deliveredAt = now;
  if (newStatus === 'CANCELLED') data.cancelledAt = now;

  if (['PROCESSING', 'PICKING', 'PACKING', 'SHIPPED'].includes(newStatus)) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { firstResponseAt: true } });
    if (order && !order.firstResponseAt) data.firstResponseAt = now;
  }

  if (sla) {
    if (['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'].includes(newStatus)) {
      if (sla.deadline) {
        const met = newStatus !== 'CANCELLED' && newStatus !== 'RETURNED' && sla.deadline >= now;
        data.slaStatus = met ? 'MET' : 'BREACHED';
        if (!met && !sla.status?.startsWith('BREACHED')) {
          data.slaBreachedAt = now;
        }
      } else {
        data.slaStatus = newStatus === 'CANCELLED' ? 'CANCELLED' : 'MET';
      }
    } else if (sla.deadline) {
      const minutesLeft = (sla.deadline.getTime() - now.getTime()) / 60000;
      data.slaStatus = minutesLeft < 0 ? 'BREACHED' : minutesLeft < 120 ? 'AT_RISK' : 'ON_TRACK';
    }
  }

  return data;
}

export async function applyOrderStatus(
  orderId: string,
  newStatus: string,
  prevStatus: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { slaDeadline: true, slaStatus: true },
  });
  if (!order) return null;

  const data = await buildOrderStatusUpdate(
    orderId,
    newStatus,
    prevStatus,
    { deadline: order.slaDeadline, status: order.slaStatus }
  );

  return prisma.order.update({ where: { id: orderId }, data });
}
