import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const KNOWN_COURIERS = ['SHIPROCKET', 'DELHIVERY', 'BLUEDART', 'XPRESSBEES', 'FEDEX'];

export const getRoutingConfigs = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const configs = await prisma.courierConfig.findMany({
    where: { tenantId },
    orderBy: [{ isActive: 'desc' }, { priority: 'asc' }],
  });
  res.json(configs);
};

export const upsertRoutingConfig = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { courierName, isActive, priority, pincodePrefixes, minWeight, maxWeight, minOrderValue, maxOrderValue, speedTier } = req.body;

  if (!courierName) return res.status(400).json({ message: 'Courier name is required' });

  const config = await prisma.courierConfig.upsert({
    where: { tenantId_courierName: { tenantId, courierName: courierName.toUpperCase() } },
    update: {
      isActive: isActive ?? true,
      priority: priority ?? 10,
      pincodePrefixes: pincodePrefixes ?? null,
      minWeight: minWeight != null ? minWeight : null,
      maxWeight: maxWeight != null ? maxWeight : null,
      minOrderValue: minOrderValue != null ? minOrderValue : null,
      maxOrderValue: maxOrderValue != null ? maxOrderValue : null,
      speedTier: speedTier || 'standard',
    },
    create: {
      tenantId,
      courierName: courierName.toUpperCase(),
      isActive: isActive ?? true,
      priority: priority ?? 10,
      pincodePrefixes: pincodePrefixes ?? null,
      minWeight: minWeight != null ? minWeight : undefined,
      maxWeight: maxWeight != null ? maxWeight : undefined,
      minOrderValue: minOrderValue != null ? minOrderValue : undefined,
      maxOrderValue: maxOrderValue != null ? maxOrderValue : undefined,
      speedTier: speedTier || 'standard',
    },
  });

  res.json(config);
};

export const deleteRoutingConfig = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const config = await prisma.courierConfig.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!config) return res.status(404).json({ message: 'Config not found' });

  await prisma.courierConfig.delete({ where: { id } });
  res.json({ message: 'Routing config deleted' });
};

export const suggestCourier = async (req: AuthRequest, res: Response) => {
  const { orderId, pincode, weight, orderValue } = req.body;
  const tenantId = req.user!.tenant_id;

  let pincodeStr = pincode as string | undefined;
  let weightNum = weight != null ? Number(weight) : undefined;
  let valueNum = orderValue != null ? Number(orderValue) : undefined;

  if (orderId && !pincodeStr && !weightNum && valueNum == null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tracking: true, items: { include: { sku: true } } },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const address = (order.shippingAddress || '').replace(/\s/g, '');
    const zipMatch = address.match(/\b(\d{6})\b/);
    pincodeStr = zipMatch ? zipMatch[1] : undefined;
    valueNum = order.items.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  }

  const activeConfigs = await prisma.courierConfig.findMany({
    where: { tenantId, isActive: true },
    orderBy: { priority: 'asc' },
  });

  const prefix = pincodeStr ? pincodeStr.substring(0, 2) : '';
  const firstChar = pincodeStr ? pincodeStr.charAt(0) : '';
  const candidates: any[] = [];

  for (const cfg of activeConfigs) {
    let match = true;

    if (cfg.pincodePrefixes && cfg.pincodePrefixes !== '*') {
      const prefixes = cfg.pincodePrefixes.split(',').map(p => p.trim());
      const matched = prefixes.some(p => {
        if (p.length === 1) return firstChar === p;
        if (p.length === 2) return prefix === p;
        if (p.length === 3) return pincodeStr?.startsWith(p);
        return pincodeStr === p;
      });
      if (!matched) match = false;
    }

    if (cfg.minWeight != null && weightNum != null && weightNum < Number(cfg.minWeight)) match = false;
    if (cfg.maxWeight != null && weightNum != null && weightNum > Number(cfg.maxWeight)) match = false;

    if (cfg.minOrderValue != null && valueNum != null && valueNum < Number(cfg.minOrderValue)) match = false;
    if (cfg.maxOrderValue != null && valueNum != null && valueNum > Number(cfg.maxOrderValue)) match = false;

    if (match) {
      candidates.push({
        courierName: cfg.courierName,
        priority: cfg.priority,
        speedTier: cfg.speedTier,
        matchedPincode: pincodeStr,
      });
    }
  }

  if (candidates.length === 0) {
    const fallback = KNOWN_COURIERS.filter(c => process.env[`${c}_TOKEN`]);
    return res.json({
      suggested: null,
      candidates: [],
      fallback: fallback.length > 0 ? fallback : ['SHIPROCKET'],
      message: 'No routing rule matched. Use fallback courier.',
    });
  }

  res.json({
    suggested: candidates[0],
    candidates,
    fallback: [],
    message: candidates.length > 0 ? `Best match: ${candidates[0].courierName}` : 'No courier matched.',
  });
};
