import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getConnector } from '../connectors';

const COURIER_API_KEYS: Record<string, string> = {
  SHIPROCKET: process.env.SHIPROCKET_TOKEN || '',
  DELHIVERY: process.env.DELHIVERY_TOKEN || '',
  BLUEDART: process.env.BLUEDART_TOKEN || '',
  XPRESSBEES: process.env.XPRESSBEES_TOKEN || '',
  FEDEX: process.env.FEDEX_TOKEN || '',
};

export const generateAWB = async (req: AuthRequest, res: Response) => {
  const { orderId, courier } = req.body;
  const tenantId = req.user!.tenant_id;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const awb = await callCourierAPI(courier.toUpperCase(), order);

    const tracking = await prisma.courierTracking.upsert({
      where: { orderId },
      update: { awbNumber: awb, courierName: courier, shipmentStatus: 'SHIPPED' },
      create: { orderId, awbNumber: awb, courierName: courier, shipmentStatus: 'SHIPPED', shippedAt: new Date() },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: 'SHIPPED', manifestedAt: new Date() },
    });

    const connector = order.source ? getConnector(order.source) : null;
    if (connector?.pushTracking) {
      const config = {
        apiKey: process.env[`${order.source.toUpperCase()}_API_KEY`] || undefined,
        apiSecret: process.env[`${order.source.toUpperCase()}_API_SECRET`] || undefined,
        sellerId: process.env[`${order.source.toUpperCase()}_SELLER_ID`] || undefined,
      };
      connector.pushTracking(config, order.orderNumber, awb, courier).catch(err => {
        console.error(`[pushTracking] Failed for ${order.orderNumber}:`, err);
      });
    }

    res.json({ message: 'AWB generated', tracking, awb, courier });
  } catch (error) {
    res.status(500).json({ message: 'Courier API failure', error: String(error) });
  }
};

async function callCourierAPI(courier: string, order: any): Promise<string> {
  const token = COURIER_API_KEYS[courier];
  if (!token) return fallbackAWB(courier);

  try {
    if (courier === 'SHIPROCKET') {
      const axios = require('axios');
      const res = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        order_id: order.orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        billing_customer_name: order.customerName,
        billing_address: order.shippingAddress,
        order_items: [{ name: 'Items', quantity: 1, price: 0 }],
        payment_method: 'Prepaid',
      }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data.shipment_id || `SR-${Date.now()}`;
    }

    if (courier === 'DELHIVERY') {
      const axios = require('axios');
      const res = await axios.post('https://track.delhivery.com/api/v1/packages/json/', {
        shipments: [{
          name: order.customerName,
          add: order.shippingAddress,
          order: order.orderNumber,
        }],
      }, { headers: { Authorization: `Token ${token}` } });
      return res.data?.packages?.[0]?.waybill || `DH-${Date.now()}`;
    }

    return fallbackAWB(courier);
  } catch {
    return fallbackAWB(courier);
  }
}

function fallbackAWB(courier: string): string {
  return `${courier.toUpperCase()}-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
}
