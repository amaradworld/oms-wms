import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getIntegrations = async (req: AuthRequest, res: Response) => {
  const integrations = await prisma.platformIntegration.findMany({
    where: { tenantId: req.user!.tenant_id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(integrations);
};

export const getIntegration = async (req: AuthRequest, res: Response) => {
  const integration = await prisma.platformIntegration.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
  });
  if (!integration) return res.status(404).json({ message: 'Integration not found' });
  res.json(integration);
};

export const createIntegration = async (req: AuthRequest, res: Response) => {
  const { name, platform, apiBaseUrl, apiKey, apiSecret, accessToken, webhookUrl, syncInventory, syncOrders, syncProducts, config } = req.body;
  const existing = await prisma.platformIntegration.findFirst({
    where: { tenantId: req.user!.tenant_id, name },
  });
  if (existing) return res.status(400).json({ message: 'Integration with this name already exists' });

  const integration = await prisma.platformIntegration.create({
    data: {
      tenantId: req.user!.tenant_id,
      name, platform, apiBaseUrl, apiKey, apiSecret, accessToken, webhookUrl,
      syncInventory: syncInventory ?? false,
      syncOrders: syncOrders ?? false,
      syncProducts: syncProducts ?? false,
      config: config || undefined,
    },
  });
  res.status(201).json(integration);
};

export const updateIntegration = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.platformIntegration.findFirst({
    where: { id: id as string, tenantId: req.user!.tenant_id },
  });
  if (!existing) return res.status(404).json({ message: 'Integration not found' });

  const { name, platform, apiBaseUrl, apiKey, apiSecret, accessToken, webhookUrl, syncInventory, syncOrders, syncProducts, isActive, config } = req.body;
  const integration = await prisma.platformIntegration.update({
    where: { id: id as string },
    data: {
      name, platform, apiBaseUrl, apiKey, apiSecret, accessToken, webhookUrl,
      syncInventory, syncOrders, syncProducts, isActive,
      config: config || undefined,
    },
  });
  res.json(integration);
};

export const deleteIntegration = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.platformIntegration.findFirst({
    where: { id: id as string, tenantId: req.user!.tenant_id },
  });
  if (!existing) return res.status(404).json({ message: 'Integration not found' });
  await prisma.platformIntegration.delete({ where: { id: id as string } });
  res.json({ message: 'Integration deleted' });
};

export const triggerSync = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const integration = await prisma.platformIntegration.findFirst({
    where: { id: id as string, tenantId: req.user!.tenant_id },
  });
  if (!integration) return res.status(404).json({ message: 'Integration not found' });
  if (!integration.isActive) return res.status(400).json({ message: 'Integration is inactive' });

  const results: any[] = [];

  if (integration.syncInventory) {
    const inventory = await prisma.inventory.findMany({
      where: {
        warehouse: { tenantId: req.user!.tenant_id },
        quantityOnHand: { gt: 0 },
      },
      include: {
        sku: { select: { skuCode: true, name: true, mrp: true, hsnCode: true } },
        warehouse: { select: { name: true } },
      },
    });

    const payload = inventory.map(i => ({
      skuCode: i.sku.skuCode,
      name: i.sku.name,
      quantity: i.quantityAvailable,
      mrp: i.sku.mrp ? Number(i.sku.mrp) : 0,
      hsnCode: i.sku.hsnCode,
      warehouse: i.warehouse.name,
      binLocation: i.binLocation,
    }));

    if (integration.apiBaseUrl && integration.accessToken) {
      try {
        const syncRes = await fetch(`${integration.apiBaseUrl}/api/inventory/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${integration.accessToken}`,
          },
          body: JSON.stringify({ inventory: payload }),
        });
        const text = await syncRes.text();
        results.push({ type: 'inventory', status: syncRes.status, response: text.slice(0, 500) });
      } catch (err: any) {
        results.push({ type: 'inventory', status: 'error', error: err.message });
      }
    } else {
      results.push({ type: 'inventory', status: 'skipped', reason: 'No API URL or token configured' });
    }
  }

  await prisma.platformIntegration.update({
    where: { id: id as string },
    data: { lastSyncAt: new Date() },
  });

  res.json({ message: 'Sync completed', integration: integration.name, results });
};
