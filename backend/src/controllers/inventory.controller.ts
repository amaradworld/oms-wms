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
