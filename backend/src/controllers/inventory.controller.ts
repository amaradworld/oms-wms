import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getInventory = async (req: AuthRequest, res: Response) => {
  const items = await prisma.inventory.findMany({
    where: { warehouse: { tenantId: req.user!.tenant_id } },
    include: { sku: true, warehouse: true },
    orderBy: { lastUpdated: 'desc' },
  });

  const result = items.map(i => ({
    id: i.id,
    skuCode: i.sku.skuCode,
    name: i.sku.name,
    category: i.sku.category,
    hsnCode: i.sku.hsnCode,
    warehouse: i.warehouse.name,
    binLocation: i.binLocation,
    quantityOnHand: i.quantityOnHand,
    quantityAvailable: i.quantityAvailable,
  }));

  res.json(result);
};
