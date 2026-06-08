import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit, logUpdateAudit, captureSnapshot } from '../services/audit.service';
import { applyOrderStatus, buildOrderStatusUpdate } from '../services/orderStage.service';

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const warehouseId = req.query.warehouseId as string | undefined;
    const source = req.query.source as string | undefined;
    const orderStatus = req.query.orderStatus as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const where: any = { tenantId: tenant_id };
    if (warehouseId) where.warehouseId = warehouseId;
    if (source && source !== 'ALL') where.source = source;
    if (orderStatus && orderStatus !== 'ALL') {
      const statuses = orderStatus.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) where.orderStatus = statuses[0];
      else if (statuses.length > 1) where.orderStatus = { in: statuses };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { sku: { select: { skuCode: true, name: true, size: true, color: true } } } }, warehouse: { select: { name: true } }, tracking: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders',  });
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
    const {
      orderNumber, customerName, shippingAddress, items, warehouseId, source,
      displayOrderCode, customerCode, customerGstin, notificationEmail, notificationMobile,
      currency, paymentMode, paymentStatus, channelProcessingTime, deliverMode, pdfAttachment,
      orderAmount, discountAmount, giftWrapCharges, shippingCharges,
      billingName, billingAddress1, billingAddress2, billingCountry, billingState,
      billingCity, billingDistrict, billingPinCode, billingPhone, billingLatitude, billingLongitude, billingEmail,
    } = req.body;
    const src = source || 'MANUAL';
    const tenantId = req.user!.tenant_id;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    const fallbackBilling = billingName ? {
      billingName, billingAddress1, billingAddress2, billingCountry, billingState,
      billingCity, billingDistrict, billingPinCode, billingPhone, billingLatitude, billingLongitude, billingEmail,
    } : {};

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber, customerName, shippingAddress, tenantId,
          source: src,
          displayOrderCode: displayOrderCode || null,
          customerCode: customerCode || null,
          customerGstin: customerGstin || null,
          notificationEmail: notificationEmail || null,
          notificationMobile: notificationMobile || null,
          currency: currency || 'INR',
          paymentMode: paymentMode || null,
          paymentStatus: paymentStatus || null,
          channelProcessingTime: channelProcessingTime ? new Date(channelProcessingTime) : null,
          deliverMode: deliverMode || null,
          pdfAttachment: pdfAttachment || null,
          orderAmount: orderAmount ? parseFloat(orderAmount) : null,
          discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
          giftWrapCharges: giftWrapCharges ? parseFloat(giftWrapCharges) : 0,
          shippingCharges: shippingCharges ? parseFloat(shippingCharges) : 0,
          slaDeadline: computeSlaDeadline(src),
          slaStatus: 'ON_TRACK',
          warehouseId: warehouseId || null,
          ...fallbackBilling,
          items: {
            create: items.map(i => ({
              skuId: i.skuId,
              quantity: i.quantity,
              unitPrice: i.unitPrice || 0,
              mrp: i.mrp || null,
              discountAmount: i.discountAmount || 0,
              totalAmount: ((i.unitPrice || 0) * i.quantity) - (i.discountAmount || 0),
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
    logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', entityType: 'Order', entityId: order.id, newValue: { orderNumber, source: src, itemCount: items.length } });
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  try {
    const before = await captureSnapshot('Order', id);
    const order = await applyOrderStatus(id, status, before?.orderStatus || '');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
    const userId = (req as any).user?.id || '';
    const tenantId = (req as any).user?.tenant_id || '';
    if (userId && tenantId) {
      await logUpdateAudit({
        tenantId, userId,
        action: 'UPDATE_STATUS',
        entityType: 'Order',
        entityId: id,
        before,
        after: { ...before, ...order } as any,
      });
    }
  } catch (error) {
    res.status(404).json({ message: 'Order not found' });
  }
};

export const updateOrder = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { customerName, shippingAddress, notificationEmail, notificationMobile, billingName, billingAddress1, billingCity, billingPinCode, billingPhone } = req.body;
  try {
    const order = await prisma.order.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const data: Record<string, unknown> = {};
    if (customerName !== undefined) data.customerName = customerName;
    if (shippingAddress !== undefined) data.shippingAddress = shippingAddress;
    if (notificationEmail !== undefined) data.notificationEmail = notificationEmail;
    if (notificationMobile !== undefined) data.notificationMobile = notificationMobile;
    if (billingName !== undefined) data.billingName = billingName;
    if (billingAddress1 !== undefined) data.billingAddress1 = billingAddress1;
    if (billingCity !== undefined) data.billingCity = billingCity;
    if (billingPinCode !== undefined) data.billingPinCode = billingPinCode;
    if (billingPhone !== undefined) data.billingPhone = billingPhone;

    const updated = await prisma.order.update({ where: { id }, data });
    res.json(updated);
    logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'UPDATE', entityType: 'Order', entityId: id, newValue: data });
  } catch (error) {
    res.status(400).json({ message: String(error) });
  }
};

export const splitOrder = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { splits } = req.body;
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
            slaStatus: 'ON_TRACK',
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
  logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'SPLIT', entityType: 'Order', entityId: id, newValue: { splitCount: result.length + 1 } });
};

export const cancelOrder = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const before = await captureSnapshot('Order', id);
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!o) throw new Error('Order not found');

      for (const item of o.items) {
        if (!o.warehouseId) continue;
        await tx.inventory.upsert({
          where: {
            warehouseId_skuId_binLocation: {
              warehouseId: o.warehouseId,
              skuId: item.skuId,
              binLocation: 'RETURNED',
            },
          },
          update: {
            quantityOnHand: { increment: item.quantity },
            quantityAvailable: { increment: item.quantity },
          },
          create: {
            warehouseId: o.warehouseId,
            skuId: item.skuId,
            binLocation: 'RETURNED',
            quantityOnHand: item.quantity,
            quantityAvailable: item.quantity,
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), slaStatus: 'CANCELLED' },
      });
    });
    res.json(order);
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenant_id;
    if (userId && tenantId) {
      await logUpdateAudit({
        tenantId, userId,
        action: 'CANCEL',
        entityType: 'Order',
        entityId: id,
        before,
        after: { ...before, ...order } as any,
      });
    }
  } catch (error) {
    res.status(400).json({ message: String(error) });
  }
};

export const getOrderSlaSummary = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
  const source = req.query.source as string | undefined;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: any = { tenantId, createdAt: { gte: since } };
  if (source && source !== 'ALL') where.source = source;

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true, orderNumber: true, source: true, orderStatus: true,
      slaDeadline: true, slaStatus: true, slaBreachedAt: true,
      createdAt: true, deliveredAt: true, dispatchedAt: true,
    },
  });

  const total = orders.length;
  const closed = orders.filter(o => ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'].includes(o.orderStatus));
  const breached = orders.filter(o => o.slaStatus === 'BREACHED' || (o.slaDeadline && o.slaDeadline < o.createdAt && !o.deliveredAt));
  const met = closed.filter(o => {
    if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'RETURNED') return false;
    if (!o.slaDeadline) return true;
    const closeTime = o.deliveredAt || o.dispatchedAt;
    return closeTime && closeTime <= o.slaDeadline;
  });
  const late = closed.filter(o => {
    if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'RETURNED') return false;
    if (!o.slaDeadline) return false;
    const closeTime = o.deliveredAt || o.dispatchedAt;
    return closeTime && closeTime > o.slaDeadline;
  });

  const onTimeRate = closed.length > 0 ? Math.round((met.length / closed.length) * 100) : 0;
  const breachRate = total > 0 ? Math.round((breached.length / total) * 100) : 0;

  const lateTimes = late
    .map(o => {
      const closeTime = o.deliveredAt || o.dispatchedAt;
      if (!closeTime || !o.slaDeadline) return 0;
      return (closeTime.getTime() - o.slaDeadline.getTime()) / 1000;
    })
    .filter(t => t > 0);

  const bySource: Record<string, { total: number; closed: number; met: number; onTimeRate: number }> = {};
  for (const o of orders) {
    const src = o.source || 'UNKNOWN';
    if (!bySource[src]) bySource[src] = { total: 0, closed: 0, met: 0, onTimeRate: 0 };
    bySource[src].total++;
    if (['DELIVERED', 'DISPATCHED'].includes(o.orderStatus)) {
      bySource[src].closed++;
      if (o.slaDeadline) {
        const closeTime = o.deliveredAt || o.dispatchedAt;
        if (closeTime && closeTime <= o.slaDeadline) bySource[src].met++;
      }
    }
  }
  for (const k of Object.keys(bySource)) {
    bySource[k].onTimeRate = bySource[k].closed > 0 ? Math.round((bySource[k].met / bySource[k].closed) * 100) : 0;
  }

  const bySlaStatus = orders.reduce<Record<string, number>>((acc, o) => {
    const k = o.slaStatus || 'UNKNOWN';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  res.json({
    window: { days, from: since.toISOString(), to: new Date().toISOString(), source: source || 'ALL' },
    total,
    closed: closed.length,
    active: total - closed.length,
    onTime: { count: met.length, rate: onTimeRate },
    late: {
      count: late.length,
      rate: closed.length > 0 ? Math.round((late.length / closed.length) * 100) : 0,
      avgLateSec: lateTimes.length ? Math.round(lateTimes.reduce((a, b) => a + b, 0) / lateTimes.length) : 0,
      p95LateSec: lateTimes.length ? lateTimes[Math.min(lateTimes.length - 1, Math.floor(lateTimes.length * 0.95))] : 0,
    },
    breached: { count: breached.length, rate: breachRate },
    bySlaStatus,
    bySource,
  });
};
