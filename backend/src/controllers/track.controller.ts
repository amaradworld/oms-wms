import { Response } from 'express';
import prisma from '../services/prisma';

export const trackByAWB = async (req: any, res: Response) => {
  const { awb } = req.params;
  try {
    const tracking = await prisma.courierTracking.findUnique({
      where: { awbNumber: awb },
      include: {
        order: {
          select: { orderNumber: true, customerName: true, orderStatus: true, shippingAddress: true, createdAt: true },
        },
      },
    });
    if (!tracking) return res.status(404).json({ message: 'AWB not found' });
    res.json(tracking);
  } catch {
    res.status(500).json({ message: 'Error' });
  }
};
