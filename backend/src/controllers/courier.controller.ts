import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const generateAWB = async (req: AuthRequest, res: Response) => {
  const { orderId, courier } = req.body;
  const tenantId = req.user!.tenant_id;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const awbData = await callCourierAPI(courier, order);

    const tracking = await prisma.courierTracking.upsert({
      where: { orderId },
      update: { awbNumber: awbData.awb, courierName: courier, shipmentStatus: 'SHIPPED' },
      create: { orderId, awbNumber: awbData.awb, courierName: courier, shipmentStatus: 'SHIPPED', shippedAt: new Date() },
    });

    await prisma.order.update({ where: { id: orderId }, data: { orderStatus: 'SHIPPED' } });

    res.json({ message: 'AWB generated', tracking, awb: awbData.awb, courier });
  } catch (error) {
    res.status(500).json({ message: 'Courier API failure', error: String(error) });
  }
};

async function callCourierAPI(courier: string, order: any) {
  return { awb: `${courier.toUpperCase()}-${Math.random().toString(36).toUpperCase().substring(2, 10)}` };
}
