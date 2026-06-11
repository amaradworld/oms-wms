import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { checkAllShipments, deliverOrder } from '../services/delivery.service';

export const checkDeliveries = async (req: AuthRequest, res: Response) => {
  const cronSecret = req.query.secret as string;
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Invalid cron secret' });
  }

  try {
    const result = await checkAllShipments();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Delivery check failed', });
  }
};

export const markDelivered = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { confirmed } = req.body;
  
  // Require explicit confirmation for manual delivery marking
  if (!confirmed) {
    return res.status(400).json({ 
      message: 'Manual delivery requires explicit confirmation',
      hint: 'Set "confirmed: true" in request body to confirm delivery'
    });
  }
  
  try {
    const result = await deliverOrder(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: String(error) });
  }
};

export const getShippedOrders = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: tenant_id, orderStatus: 'SHIPPED' },
      include: { tracking: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipped orders', });
  }
};
