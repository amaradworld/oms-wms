import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const warehouseId = req.query.warehouseId as string | undefined;
    const source = req.query.source as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const where: any = { tenantId: tenant_id };
    if (warehouseId) where.warehouseId = warehouseId;
    if (source && source !== 'ALL') where.source = source;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { sku: { select: { skuCode: true, name: true } } } }, warehouse: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

const SLA_HOURS: Record<string, number> = {
  NYKAA: 24,
  MYNTRA: 24,
  TATACLIQ: 48,
  SHOPIFY: 48,
  AMAZON: 24,
  FLIPKART: 24,
  MEESHO: 48,
};

function computeSlaDeadline(source?: string): Date {
  const hours = (source ? SLA_HOURS[source.toUpperCase()] : null) || 48;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderNumber, customerName, shippingAddress, items, warehouseId } = req.body;
    const source = req.body.source || 'MANUAL';
    const tenantId = req.user!.tenant_id;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          shippingAddress,
          tenantId,
          source,
          slaDeadline: computeSlaDeadline(source),
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

export const splitOrder = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { splits } = req.body;
  // splits: [{ warehouseId, itemIds: [orderItemId, ...] }, ...]

  if (!splits || !Array.isArray(splits) || splits.length < 2) {
    return res.status(400).json({ message: 'At least 2 splits required' });
  }

  const order = await prisma.order.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'PROCESSING') {
    return res.status(400).json({ message: 'Can only split pending/processing orders' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const newOrders: any[] = [];

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitItems = order.items.filter(item => split.itemIds.includes(item.id));
      if (splitItems.length === 0) continue;

      const isOriginal = i === 0;

      if (isOriginal) {
        const remaining = order.items.filter(item => !split.itemIds.includes(item.id));
        await tx.orderItem.deleteMany({ where: { orderId: order.id, id: { in: remaining.map(r => r.id) } } });
      } else {
        const newOrder = await tx.order.create({
          data: {
            tenantId: order.tenantId,
            warehouseId: split.warehouseId || order.warehouseId,
            orderNumber: `${order.orderNumber}-SPLIT-${i}`,
            source: order.source,
            customerName: order.customerName,
            shippingAddress: order.shippingAddress,
            orderStatus: 'PENDING',
            slaDeadline: order.slaDeadline,
            items: {
              create: splitItems.map(item => ({
                skuId: item.skuId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: item.totalAmount,
              })),
            },
          },
        });
        newOrders.push(newOrder);
      }
    }

    return newOrders;
  });

  res.status(201).json({ message: `Order split into ${result.length + 1} orders`, splitOrders: result });
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
