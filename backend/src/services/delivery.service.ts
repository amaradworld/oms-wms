import prisma from './prisma';

const COURIER_API_KEYS: Record<string, string> = {
  SHIPROCKET: process.env.SHIPROCKET_TOKEN || '',
  DELHIVERY: process.env.DELHIVERY_TOKEN || '',
};

async function checkShiprocket(awb: string): Promise<string> {
  const token = COURIER_API_KEYS['SHIPROCKET'];
  if (!token) return 'UNKNOWN';
  try {
    const axios = require('axios');
    const res = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/track/shipments/${awb}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = res.data?.tracking_data?.shipment_track?.[0]?.current_status || '';
    if (/delivered/i.test(status)) return 'DELIVERED';
    if (/out for delivery|in transit|shipped/i.test(status)) return 'IN_TRANSIT';
    return 'PICKED_UP';
  } catch {
    return 'UNKNOWN';
  }
}

async function checkDelhivery(awb: string): Promise<string> {
  const token = COURIER_API_KEYS['DELHIVERY'];
  if (!token) return 'UNKNOWN';
  try {
    const axios = require('axios');
    const res = await axios.get(`https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const status = res.data?.ShipmentData?.[0]?.Shipment?.Status?.StatusType || '';
    if (/delivered/i.test(status)) return 'DELIVERED';
    if (/in transit|out for delivery|dispatched/i.test(status)) return 'IN_TRANSIT';
    return 'PICKED_UP';
  } catch {
    return 'UNKNOWN';
  }
}

function checkFallback(shippedAt: Date | null): string {
  if (!shippedAt) return 'UNKNOWN';
  const daysSinceShip = (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceShip >= 5) return 'DELIVERED';
  if (daysSinceShip >= 2) return 'IN_TRANSIT';
  return 'PICKED_UP';
}

async function checkCourierStatus(tracking: {
  courierName: string;
  awbNumber: string;
  shippedAt: Date | null;
}): Promise<string> {
  const courier = tracking.courierName.toUpperCase();
  const awb = tracking.awbNumber;

  if (awb.startsWith('SR-') || awb.startsWith('SHIPROCKET-')) {
    const status = await checkShiprocket(awb);
    if (status !== 'UNKNOWN') return status;
  }
  if (awb.startsWith('DH-') || awb.startsWith('DELHIVERY-') || courier === 'DELHIVERY') {
    const status = await checkDelhivery(awb);
    if (status !== 'UNKNOWN') return status;
  }

  return checkFallback(tracking.shippedAt);
}

export async function checkAllShipments(): Promise<{ updated: number; total: number; errors: string[] }> {
  const orders = await prisma.order.findMany({
    where: { orderStatus: 'SHIPPED' },
    include: { tracking: true },
  });

  const errors: string[] = [];
  let updated = 0;

  for (const order of orders) {
    if (!order.tracking) continue;
    try {
      const status = await checkCourierStatus(order.tracking);
      if (status === 'DELIVERED') {
        await prisma.$transaction([
          prisma.order.update({ where: { id: order.id }, data: { orderStatus: 'DELIVERED' } }),
          prisma.courierTracking.update({ where: { orderId: order.id }, data: { shipmentStatus: 'DELIVERED' } }),
        ]);
        updated++;
      }
    } catch (e) {
      errors.push(`Order ${order.orderNumber}: ${String(e)}`);
    }
  }

  return { updated, total: orders.length, errors };
}

export async function deliverOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });
  if (!order) throw new Error('Order not found');
  if (order.orderStatus === 'DELIVERED') throw new Error('Order already delivered');

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { orderStatus: 'DELIVERED' } }),
    ...(order.tracking
      ? [prisma.courierTracking.update({ where: { orderId }, data: { shipmentStatus: 'DELIVERED' } })]
      : []),
  ]);

  return { id: orderId, orderNumber: order.orderNumber, orderStatus: 'DELIVERED' };
}
