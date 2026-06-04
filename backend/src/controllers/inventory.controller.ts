import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { resolveSku } from '../utils/sku-resolver';

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
      styleName: sku.styleName,
      size: sku.size,
      color: sku.color,
      brand: sku.brand,
      category: sku.category,
      material: sku.material,
      gender: sku.gender,
      unitType: sku.unitType,
      mrp: sku.mrp,
      hsnCode: sku.hsnCode,
      weight: sku.weight,
      dimensions: sku.dimensions,
      warehouse: inv?.warehouse?.name || null,
      warehouseId: inv?.warehouseId || null,
      binLocation: inv?.binLocation || null,
      reorderPoint: inv?.reorderPoint ?? 0,
      quantityOnHand: inv?.quantityOnHand ?? 0,
      quantityReserved: inv?.quantityReserved ?? 0,
      quantityAvailable: inv?.quantityAvailable ?? 0,
      virtualInventory: inv?.virtualInventory ?? 0,
      notFound: inv?.notFound ?? 0,
      type: inv?.type || 'Good',
      batch: inv?.batch || null,
      batchStatus: inv?.batchStatus || null,
      status: inv?.status || 'ACTIVE',
      inventoryAllocation: inv?.inventoryAllocation ?? true,
      inventorySync: inv?.inventorySync ?? true,
      skuMixing: inv?.skuMixing ?? true,
      shelfOnHold: inv?.shelfOnHold ?? false,
      lastUpdated: inv?.lastUpdated || null,
    };
  });

  res.json(result);
};

export const scanInventory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { skuCode, epcCode, warehouseId } = req.body;
  const code = skuCode || epcCode;

  if (!code) {
    res.status(400).json({ message: 'skuCode or epcCode is required' });
    return;
  }

  const sku = await resolveSku(tenantId, code);
  if (!sku) {
    res.status(404).json({ message: `SKU with code ${code} not found` });
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
        virtualInventory: 0,
        notFound: 0,
        type: 'Good',
        status: 'ACTIVE',
        inventoryAllocation: true,
        inventorySync: true,
        skuMixing: true,
        shelfOnHold: false,
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
