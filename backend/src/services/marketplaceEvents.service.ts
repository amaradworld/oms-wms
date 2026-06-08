import { EventEmitter } from 'events';
import prisma from './prisma';
import { getConnector } from '../connectors';

const marketEvents = new EventEmitter();
marketEvents.setMaxListeners(20);

export interface InventoryChangeEvent {
  tenantId: string;
  skuCode: string;
  quantity: number;
  warehouseId?: string;
}

export interface OrderStatusEvent {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  newStatus: string;
  awb?: string;
  courier?: string;
}

export function emitInventoryChange(event: InventoryChangeEvent) {
  marketEvents.emit('inventory:change', event);
}

export function emitOrderStatusChange(event: OrderStatusEvent) {
  marketEvents.emit('order:status', event);
}

async function handleInventoryChange(event: InventoryChangeEvent) {
  try {
    const configs = await prisma.marketplaceConfig.findMany({
      where: { tenantId: event.tenantId, syncStatus: { not: 'error' } },
    });
    for (const config of configs) {
      const connector = getConnector(config.marketplace);
      if (!connector?.updateInventory) continue;
      connector.updateInventory(
        { apiKey: config.apiKey || undefined, apiSecret: config.apiSecret || undefined, sellerId: config.sellerId || undefined },
        [{ skuCode: event.skuCode, quantity: event.quantity }]
      ).catch(err => {
        console.error(`[MarketplaceEvent] inventory sync failed for ${config.marketplace}:`, err.message);
      });
    }
  } catch (err: any) {
    console.error(`[MarketplaceEvent] inventory change handler error:`, err.message);
  }
}

async function handleOrderStatus(event: OrderStatusEvent) {
  try {
    const mapping = await prisma.marketplaceOrderMapping.findFirst({
      where: { tenantId: event.tenantId, localOrderId: event.orderId },
    });
    if (!mapping) return;

    const config = await prisma.marketplaceConfig.findUnique({
      where: { tenantId_marketplace: { tenantId: event.tenantId, marketplace: mapping.marketplace } },
    });
    if (!config) return;

    const connector = getConnector(mapping.marketplace);
    if (!connector) return;

    if (['SHIPPED', 'DISPATCHED'].includes(event.newStatus) && event.awb && connector.pushTracking) {
      connector.pushTracking(
        { apiKey: config.apiKey || undefined, apiSecret: config.apiSecret || undefined, sellerId: config.sellerId || undefined },
        event.orderNumber,
        event.awb,
        event.courier || 'Unknown'
      ).catch(err => {
        console.error(`[MarketplaceEvent] tracking push failed for ${mapping.marketplace}:`, err.message);
      });
    }

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(event.newStatus) && connector.pushStatus) {
      connector.pushStatus(
        { apiKey: config.apiKey || undefined, apiSecret: config.apiSecret || undefined, sellerId: config.sellerId || undefined },
        event.orderNumber,
        event.newStatus,
        event.newStatus === 'CANCELLED' ? 'Cancelled by seller' : event.newStatus === 'RETURNED' ? 'Return processed' : undefined
      ).catch(err => {
        console.error(`[MarketplaceEvent] status push failed for ${mapping.marketplace}:`, err.message);
      });
    }
  } catch (err: any) {
    console.error(`[MarketplaceEvent] order status handler error:`, err.message);
  }
}

marketEvents.on('inventory:change', handleInventoryChange);
marketEvents.on('order:status', handleOrderStatus);

export default marketEvents;
