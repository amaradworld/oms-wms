import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const warehouseId = req.query.warehouseId as string | undefined;
    const where: any = { tenantId: tenant_id };
    if (warehouseId) where.warehouseId = warehouseId;
    const orders = await prisma.order.findMany({
      where,
      include: { items: true, warehouse: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { orderNumber, customerName, shippingAddress, items, tenantId, warehouseId } = req.body;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        shippingAddress,
        tenantId,
        warehouseId: warehouseId || null,
        items: {
          create: items
        }
      }
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { orderStatus: status }
    });
    res.json(order);
  } catch (error) {
    res.status(404).json({ message: 'Order not found' });
  }
};
