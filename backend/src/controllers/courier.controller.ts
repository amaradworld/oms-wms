import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const generateAWB = async (req: AuthRequest, res: Response) => {
  const { orderId, courier } = req.body; // e.g., 'Shiprocket', 'Delhivery'
  const { tenant_id } = req.user!;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 1. Call Courier API to create shipment
    const awbData = await callCourierAPI(courier, order);

    // 2. Update courier_tracking table
    const tracking = await prisma.courierTracking.upsert({
      where: { orderId: orderId },
      update: { 
        awbNumber: awbData.awb, 
        courierName: courier, 
        shipmentStatus: 'SHIPPED' 
      },
      create: {
        orderId: orderId,
        awbNumber: awbData.awb,
        courierName: courier,
        shipmentStatus: 'SHIPPED',
        shippedAt: new Date()
      }
    });

    // 3. Update Order status to SHIPPED
    await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: 'SHIPPED' }
    });

    res.json({ message: 'AWB generated successfully', tracking });
  } catch (error) {
    res.status(500).json({ message: 'Courier API failure', error });
  }
};

async function callCourierAPI(courier: string, order: any) {
  // Simulation of AWB generation
  return { awb: `AWB-${Math.random().toString(36).toUpperCase().substring(2, 12)}` };
}
