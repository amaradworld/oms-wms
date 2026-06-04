import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const searchBatches = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const { q } = req.query;
  try {
    const result = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT DISTINCT i."batch", i."batchStatus" as batch_status, s."skuCode" as sku_code, s.name as sku_name, w.name as warehouse_name
       FROM "inventory" i
       JOIN "sku_master" s ON s.id = i."skuId"
       JOIN "warehouses" w ON w.id = i."warehouseId"
       WHERE w."tenantId" = $1
         AND i."batch" IS NOT NULL
         ${q ? `AND i."batch" ILIKE $2` : ''}
       LIMIT 50`,
      q ? [tenant_id, `%${q}%`] : [tenant_id]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search batches', error });
  }
};

export const traceBatch = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const batchNo = req.params.batchNo as string;
  try {
    const inventory = await prisma.inventory.findMany({
      where: { batch: batchNo, warehouse: { tenantId: tenant_id } },
      include: { sku: true, warehouse: true },
    });

    const grnItems = await prisma.grnItem.findMany({
      where: { batchNo, grn: { tenantId: tenant_id } },
      include: { sku: true, grn: { include: { purchaseOrder: { include: { supplier: true } } } } },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: { batchNo, order: { tenantId: tenant_id } },
      include: { sku: true, order: true },
    });

    const asnItems = await prisma.asnItem.findMany({
      where: { batchNo, asn: { tenantId: tenant_id } },
      include: { sku: true, asn: true },
    });

    const gatepassItems = await prisma.gatepassItem.findMany({
      where: { batchCode: batchNo, gatepass: { tenantId: tenant_id } },
      include: { sku: true, gatepass: true },
    });

    res.json({ batchNo, inventory, grnItems, orderItems, asnItems, gatepassItems });
  } catch (error) {
    res.status(500).json({ message: 'Failed to trace batch', error });
  }
};
