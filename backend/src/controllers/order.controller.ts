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
      include: { items: { include: { sku: { select: { skuCode: true, name: true } } } }, warehouse: { select: { name: true } } },
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

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          shippingAddress,
          tenantId,
          warehouseId: warehouseId || null,
          items: {
            create: items.map(i => ({
              skuId: i.skuId,
              quantity: i.quantity,
              unitPrice: i.unitPrice || 0,
              totalAmount: (i.unitPrice || 0) * i.quantity,
            })),
          },
        },
      });

      for (const item of items) {
        if (!warehouseId) continue;
        const inv = await tx.inventory.findFirst({
          where: { warehouseId, skuId: item.skuId },
        });
        if (inv) {
          const deduct = Math.min(item.quantity, inv.quantityAvailable);
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantityOnHand: { decrement: deduct },
              quantityAvailable: { decrement: deduct },
            },
          });
        }
      }

      return order;
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error: String(error) });
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

export const cancelOrder = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new Error('Order not found');

      for (const item of order.items) {
        if (!order.warehouseId) continue;
        await tx.inventory.upsert({
          where: {
            warehouseId_skuId_binLocation: {
              warehouseId: order.warehouseId,
              skuId: item.skuId,
              binLocation: 'RETURNED',
            },
          },
          update: {
            quantityOnHand: { increment: item.quantity },
            quantityAvailable: { increment: item.quantity },
          },
          create: {
            warehouseId: order.warehouseId,
            skuId: item.skuId,
            binLocation: 'RETURNED',
            quantityOnHand: item.quantity,
            quantityAvailable: item.quantity,
          },
        });
      }

      return tx.order.update({ where: { id }, data: { orderStatus: 'CANCELLED' } });
    });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: String(error) });
  }
};
