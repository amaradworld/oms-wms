import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { resolveSku } from '../utils/sku-resolver';
import { emitInventoryChange } from '../services/marketplaceEvents.service';

export const getInventory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const warehouseId = req.query.warehouseId as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
  const search = (req.query.search as string || '').trim().toLowerCase();

  const invWhere: any = { warehouse: { tenantId } };
  if (warehouseId) invWhere.warehouseId = warehouseId;

  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { skuCode: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { styleName: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { color: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, skus, invItems] = await Promise.all([
    prisma.skuMaster.count({ where }),
    prisma.skuMaster.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventory.findMany({
      where: invWhere,
      include: { sku: { select: { id: true } }, warehouse: { select: { name: true } } },
      orderBy: { lastUpdated: 'desc' },
    }),
  ]);

  const skuIds = new Set(skus.map(s => s.id));
  const invAgg = new Map<string, { qty: number; avail: number; resv: number; virt: number; nf: number; bin: string; wh: string; whId: string; last: Date | null }>();
  for (const inv of invItems) {
    if (!skuIds.has(inv.skuId)) continue;
    const key = inv.skuId;
    const existing = invAgg.get(key);
    if (existing) {
      existing.qty += inv.quantityOnHand;
      existing.avail += inv.quantityAvailable;
      existing.resv += inv.quantityReserved;
      existing.virt += inv.virtualInventory;
      existing.nf += inv.notFound;
      if (inv.quantityOnHand > 0) existing.bin = inv.binLocation;
      if (!existing.last || (inv.lastUpdated && inv.lastUpdated > existing.last)) {
        existing.last = inv.lastUpdated;
        if (inv.warehouse?.name) existing.wh = inv.warehouse.name;
        if (inv.warehouseId) existing.whId = inv.warehouseId;
      }
    } else {
      invAgg.set(key, {
        qty: inv.quantityOnHand, avail: inv.quantityAvailable, resv: inv.quantityReserved,
        virt: inv.virtualInventory, nf: inv.notFound,
        bin: inv.quantityOnHand > 0 ? inv.binLocation : '',
        wh: inv.warehouse?.name || '', whId: inv.warehouseId || '',
        last: inv.lastUpdated,
      });
    }
  }

  const result = skus.map(sku => {
    const agg = invAgg.get(sku.id);
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
      warehouse: agg?.wh || null,
      warehouseId: agg?.whId || null,
      binLocation: agg?.bin || null,
      reorderPoint: 0,
      quantityOnHand: agg?.qty ?? 0,
      quantityReserved: agg?.resv ?? 0,
      quantityAvailable: agg?.avail ?? 0,
      virtualInventory: agg?.virt ?? 0,
      notFound: agg?.nf ?? 0,
      type: 'Good',
      batch: null,
      batchStatus: null,
      status: 'ACTIVE',
      inventoryAllocation: true,
      inventorySync: true,
      skuMixing: true,
      shelfOnHold: false,
      lastUpdated: agg?.last || null,
    };
  });

  res.json({ items: result, total, page, totalPages: Math.ceil(total / limit) });
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

  emitInventoryChange({ tenantId, skuCode: sku.skuCode, quantity: inv.quantityOnHand, warehouseId });
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
