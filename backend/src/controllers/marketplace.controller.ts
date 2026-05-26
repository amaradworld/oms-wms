import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getConnector, getAllConnectors } from '../connectors';

// List available connectors
export const listConnectors = async (req: AuthRequest, res: Response) => {
  res.json(getAllConnectors());
};

// Get marketplace configs for tenant
export const getConfigs = async (req: AuthRequest, res: Response) => {
  const configs = await prisma.marketplaceConfig.findMany({
    where: { tenantId: req.user!.tenant_id },
    orderBy: { marketplace: 'asc' },
  });
  res.json(configs);
};

// Save or update marketplace config
export const saveConfig = async (req: AuthRequest, res: Response) => {
  const { marketplace, apiKey, apiSecret, sellerId } = req.body;
  const config = await prisma.marketplaceConfig.upsert({
    where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: marketplace.toUpperCase() } },
    update: { apiKey, apiSecret, sellerId },
    create: {
      tenantId: req.user!.tenant_id,
      marketplace: marketplace.toUpperCase(),
      apiKey,
      apiSecret,
      sellerId,
    },
  });
  res.json(config);
};

// Delete marketplace config
export const deleteConfig = async (req: AuthRequest, res: Response) => {
  const { marketplace } = req.params;
  try {
    await prisma.marketplaceConfig.delete({
      where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: marketplace.toUpperCase() } },
    });
    res.json({ message: `${marketplace} configuration removed` });
  } catch {
    res.status(404).json({ message: 'Config not found' });
  }
};

// Sync orders from a marketplace
export const syncOrders = async (req: AuthRequest, res: Response) => {
  const { marketplace } = req.params;
  const tenantId = req.user!.tenant_id;

  try {
    const config = await prisma.marketplaceConfig.findUnique({
      where: { tenantId_marketplace: { tenantId, marketplace: marketplace.toUpperCase() } },
    });
    if (!config) return res.status(400).json({ message: `No configuration found for ${marketplace}` });

    const connector = getConnector(marketplace);
    if (!connector) return res.status(400).json({ message: `Unknown marketplace: ${marketplace}` });

    await prisma.marketplaceConfig.update({
      where: { id: config.id },
      data: { syncStatus: 'syncing', syncMessage: 'Fetching orders...' },
    });

    const externalOrders = await connector.fetchOrders({
      apiKey: config.apiKey || undefined,
      apiSecret: config.apiSecret || undefined,
      sellerId: config.sellerId || undefined,
      lastSyncAt: config.lastSyncAt || undefined,
    });

    let imported = 0;
    for (const ext of externalOrders) {
      const existing = await prisma.order.findUnique({ where: { orderNumber: ext.id } });
      if (existing) continue;

      const order = await prisma.order.create({
        data: {
          orderNumber: ext.id,
          tenantId,
          source: connector.name,
          customerName: ext.customerName,
          shippingAddress: ext.shippingAddress,
          orderStatus: 'PENDING',
          paymentStatus: ext.paymentStatus,
          createdAt: ext.orderDate,
        },
      });

      for (const item of ext.items) {
        const sku = await prisma.skuMaster.findFirst({
          where: { tenantId, skuCode: item.skuCode },
        });
        if (!sku) continue;

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            skuId: sku.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
          },
        });
      }

      await prisma.marketplaceOrderMapping.create({
        data: {
          tenantId,
          marketplace: marketplace.toUpperCase(),
          marketplaceOrderId: ext.id,
          localOrderId: order.id,
          orderData: ext as any,
        },
      });

      imported++;
    }

    await prisma.marketplaceConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: new Date(), syncStatus: 'idle', syncMessage: `${imported} orders imported` },
    });

    res.json({ message: `Synced ${imported} new orders from ${connector.name}` });
  } catch (error: any) {
    await prisma.marketplaceConfig.updateMany({
      where: { tenantId, marketplace: marketplace.toUpperCase() },
      data: { syncStatus: 'error', syncMessage: error.message || 'Sync failed' },
    });
    res.status(500).json({ message: 'Sync failed', error: String(error) });
  }
};

// Get sync status
export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  const { marketplace } = req.params;
  const config = await prisma.marketplaceConfig.findUnique({
    where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: marketplace.toUpperCase() } },
  });
  if (!config) return res.status(404).json({ message: 'Not found' });
  res.json({ syncStatus: config.syncStatus, syncMessage: config.syncMessage, lastSyncAt: config.lastSyncAt });
};
