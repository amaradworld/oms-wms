import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getConnector, getAllConnectors } from '../connectors';

export const listConnectors = async (req: AuthRequest, res: Response) => {
  res.json(getAllConnectors());
};

const MASK = '••••••••';

const maskSecrets = (config: any) => ({
  ...config,
  apiKey: config.apiKey ? MASK : null,
  apiSecret: config.apiSecret ? MASK : null,
});

export const getConfigs = async (req: AuthRequest, res: Response) => {
  const configs = await prisma.marketplaceConfig.findMany({
    where: { tenantId: req.user!.tenant_id },
    orderBy: { marketplace: 'asc' },
  });
  res.json(configs.map(maskSecrets));
};

export const saveConfig = async (req: AuthRequest, res: Response) => {
  const { marketplace, apiKey, apiSecret, sellerId, safetyStockBuffer } = req.body;
  const mp = (marketplace as string).toUpperCase();
  const config = await prisma.marketplaceConfig.upsert({
    where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: mp } },
    update: { apiKey, apiSecret, sellerId, safetyStockBuffer: safetyStockBuffer ?? undefined },
    create: { tenantId: req.user!.tenant_id, marketplace: mp, apiKey, apiSecret, sellerId, safetyStockBuffer: safetyStockBuffer ?? 0 },
  });
  res.json(config);
};

export const deleteConfig = async (req: AuthRequest, res: Response) => {
  const mp = (req.params.marketplace as string).toUpperCase();
  try {
    await prisma.marketplaceConfig.delete({
      where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: mp } },
    });
    res.json({ message: `${req.params.marketplace} configuration removed` });
  } catch {
    res.status(404).json({ message: 'Config not found' });
  }
};

export const syncOrders = async (req: AuthRequest, res: Response) => {
  const mp = (req.params.marketplace as string).toUpperCase();
  const tenantId = req.user!.tenant_id;

  try {
    const config = await prisma.marketplaceConfig.findUnique({
      where: { tenantId_marketplace: { tenantId, marketplace: mp } },
    });
    if (!config) return res.status(400).json({ message: `No configuration found for ${mp}` });

    const connector = getConnector(mp);
    if (!connector) return res.status(400).json({ message: `Unknown marketplace: ${mp}` });

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
        data: { tenantId, marketplace: mp, marketplaceOrderId: ext.id, localOrderId: order.id, orderData: ext as any },
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
      where: { tenantId, marketplace: mp },
      data: { syncStatus: 'error', syncMessage: error.message || 'Sync failed' },
    });
    res.status(500).json({ message: 'Sync failed', });
  }
};

export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  const mp = (req.params.marketplace as string).toUpperCase();
  const config = await prisma.marketplaceConfig.findUnique({
    where: { tenantId_marketplace: { tenantId: req.user!.tenant_id, marketplace: mp } },
  });
  if (!config) return res.status(404).json({ message: 'Not found' });
  res.json({ syncStatus: config.syncStatus, syncMessage: config.syncMessage, lastSyncAt: config.lastSyncAt });
};
