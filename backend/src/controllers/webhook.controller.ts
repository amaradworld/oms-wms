import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { applyOrderStatus } from '../services/orderStage.service';

const MAX_DELIVERY_ATTEMPTS = 3;

interface WebhookPayload {
  marketplace: string;
  orderId: string;
  status: string;
  awbNumber?: string;
  reason?: string;
  timestamp?: string;
  attemptCount?: number;
}

function mapMarketplaceStatus(mp: string, raw: string): string {
  const s = raw.toUpperCase().replace(/[\s-_]/g, '');
  const map: Record<string, Record<string, string>> = {
    FLIPKART: {
      SHIPPED: 'SHIPPED', DISPATCHED: 'DISPATCHED', DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED', RETURNED: 'RETURNED', RTO: 'RETURNED',
      OUTFORDELIVERY: 'DISPATCHED', UNDELIVERED: 'PENDING',
    },
    NYKAA: {
      SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED', CANCELLED: 'CANCELLED',
      RETURNED: 'RETURNED', RTO: 'RETURNED', DISPATCHED: 'DISPATCHED',
    },
    MYNTRA: {
      SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED', CANCELLED: 'CANCELLED',
      RETURNED: 'RETURNED', RTO: 'RETURNED', DISPATCHED: 'DISPATCHED',
    },
    TATACLIQ: {
      SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED', CANCELLED: 'CANCELLED',
      RETURNED: 'RETURNED', RTO: 'RETURNED', DISPATCHED: 'DISPATCHED',
    },
  };
  return map[mp]?.[s] || raw.toUpperCase();
}

function isDeliveryFailure(status: string, reason?: string): boolean {
  const failStatuses = ['CANCELLED', 'RETURNED', 'RTO'];
  if (failStatuses.includes(status)) return true;
  if (reason) {
    const r = reason.toLowerCase();
    if (r.includes('failed') || r.includes('refused') || r.includes('unavailable') || r.includes('undeliverable')) return true;
  }
  return false;
}

export const handleWebhook = async (req: Request, res: Response) => {
  const marketplace = (req.params.marketplace as string).toUpperCase();
  const payload: WebhookPayload = req.body;

  if (!payload.orderId || !payload.status) {
    return res.status(400).json({ message: 'orderId and status are required' });
  }

  try {
    const mapping = await prisma.marketplaceOrderMapping.findFirst({
      where: { marketplace, marketplaceOrderId: payload.orderId },
    });
    if (!mapping) {
      console.log(`[Webhook] No mapping found for ${marketplace} order ${payload.orderId}`);
      return res.status(200).json({ message: 'Order not found locally, acknowledged' });
    }

    const order = await prisma.order.findUnique({
      where: { id: mapping.localOrderId },
      include: { items: true, tracking: true },
    });
    if (!order) return res.status(200).json({ message: 'Local order not found, acknowledged' });

    const newStatus = mapMarketplaceStatus(marketplace, payload.status);

    // Update tracking if AWB provided
    if (payload.awbNumber && order.tracking) {
      await prisma.courierTracking.update({
        where: { orderId: order.id },
        data: { shipmentStatus: newStatus, courierStatus: payload.status },
      }).catch(() => {});
    }

    // Apply order status if it's a terminal/meaningful transition
    const terminalStatuses = ['SHIPPED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
    if (terminalStatuses.includes(newStatus) && order.orderStatus !== newStatus) {
      const prevStatus = order.orderStatus;
      await applyOrderStatus(order.id, newStatus, prevStatus).catch(err => {
        console.error(`[Webhook] applyOrderStatus failed for ${order.orderNumber}:`, err.message);
      });
    }

    // Auto-create NDR on delivery failure
    if (isDeliveryFailure(newStatus, payload.reason)) {
      const existingNdr = await prisma.ndrCase.findFirst({
        where: { orderId: order.id, status: { not: 'CLOSED' } },
      });
      if (!existingNdr) {
        await prisma.ndrCase.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            courierName: order.tracking?.courierName || marketplace,
            awbNumber: payload.awbNumber || order.tracking?.awbNumber || null,
            failureReason: payload.reason || `Delivery failed: ${newStatus}`,
            status: 'OPEN',
          },
        });
        console.log(`[Webhook] Auto-created NDR for ${order.orderNumber} (${newStatus})`);
      }
    }

    // Auto-RTO after max delivery attempts
    const attemptCount = payload.attemptCount || 0;
    if (attemptCount >= MAX_DELIVERY_ATTEMPTS && !['CANCELLED', 'RETURNED', 'DELIVERED'].includes(order.orderStatus)) {
      const existingRto = await prisma.rto.findUnique({ where: { orderId: order.id } });
      if (!existingRto) {
        await prisma.rto.create({
          data: {
            orderId: order.id,
            rtoReason: payload.reason || `RTO after ${attemptCount} failed attempts`,
            status: 'PENDING_QC',
          },
        });
        await applyOrderStatus(order.id, 'RETURNED', order.orderStatus).catch(() => {});
        console.log(`[Webhook] Auto-created RTO for ${order.orderNumber} after ${attemptCount} attempts`);
      }
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${marketplace} webhook:`, error.message);
    res.status(200).json({ message: 'Acknowledged' }); // Always 200 to avoid marketplace retries
  }
};
