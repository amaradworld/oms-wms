import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getInventory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const warehouseId = req.query.warehouseId as string | undefined;

  const invWhere: any = { warehouse: { tenantId } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  const [skus, invItems] = await Promise.all([
    prisma.skuMaster.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    prisma.inventory.findMany({
      where: invWhere,
      include: { sku: true, warehouse: true },
      orderBy: { lastUpdated: 'desc' },
    }),
  ]);

  const invMap = new Map(invItems.map(i => [i.skuId, i]));

  const result = skus.map(sku => {
    const inv = invMap.get(sku.id);
    return {
      id: sku.id,
      skuCode: sku.skuCode,
      name: sku.name,
      category: sku.category,
      hsnCode: sku.hsnCode,
      weight: sku.weight,
      warehouse: inv?.warehouse?.name || null,
      binLocation: inv?.binLocation || null,
      quantityOnHand: inv?.quantityOnHand ?? 0,
      quantityAvailable: inv?.quantityAvailable ?? 0,
      lastUpdated: inv?.lastUpdated || null,
    };
  });

  res.json(result);
};

export const scanInventory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { skuCode, warehouseId } = req.body;

  if (!skuCode) {
    res.status(400).json({ message: 'skuCode is required' });
    return;
  }

  const sku = await prisma.skuMaster.findUnique({ where: { skuCode } });
  if (!sku) {
    res.status(404).json({ message: `SKU ${skuCode} not found` });
    return;
  }

  const invWhere: any = { skuId: sku.id, warehouse: { tenantId } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  let inv = await prisma.inventory.findFirst({ where: invWhere });

  if (!inv) {
    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId is required to create a new inventory record' });
      return;
    }
    inv = await prisma.inventory.create({
      data: {
        warehouseId,
        skuId: sku.id,
        binLocation: '',
        quantityOnHand: 1,
        quantityAvailable: 1,
      },
    });
  } else {
    inv = await prisma.inventory.update({
      where: { id: inv.id },
      data: {
        quantityOnHand: { increment: 1 },
        quantityAvailable: { increment: 1 },
      },
    });
  }

  res.json({ message: `Scanned +1 for ${skuCode}`, inventory: inv, sku: { skuCode: sku.skuCode, name: sku.name } });
};

export const getInventoryAlerts = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const threshold = parseInt(req.query.threshold as string) || 5;
  const warehouseId = req.query.warehouseId as string | undefined;

  const invWhere: any = { warehouse: { tenantId } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  const items = await prisma.inventory.findMany({
    where: invWhere,
    include: { sku: true, warehouse: true },
  });

  const alerts = items
    .filter(i => i.quantityAvailable <= threshold)
    .map(i => ({
      id: i.id,
      skuCode: i.sku.skuCode,
      name: i.sku.name,
      warehouseName: i.warehouse.name,
      binLocation: i.binLocation,
      quantityAvailable: i.quantityAvailable,
      reorderPoint: i.reorderPoint,
      status: i.quantityAvailable === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    }))
    .sort((a, b) => a.quantityAvailable - b.quantityAvailable);

  res.json({ alerts, total: alerts.length, threshold });
};
