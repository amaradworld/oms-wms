import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const importOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const records = req.body;
    let count = 0;

    for (const row of records) {
      if (!row.orderNumber) continue;
      const existing = await prisma.order.findUnique({ where: { orderNumber: row.orderNumber } });
      if (existing) continue;

      await prisma.order.create({
        data: {
          orderNumber: row.orderNumber,
          tenantId: tenant_id,
          customerName: row.customerName || 'Unknown',
          shippingAddress: row.shippingAddress || '',
          source: row.source || 'Manual',
          orderStatus: row.orderStatus || 'PENDING',
          items: {
            create: row.items || [{ skuId: row.skuId || 'SKU-DEFAULT', quantity: parseInt(row.quantity) || 1, unitPrice: parseFloat(row.price) || 0, totalAmount: parseFloat(row.total) || 0 }],
          },
        },
      });
      count++;
    }

    res.json({ message: `${count} orders imported successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Import failed', error: String(error) });
  }
};

export const importInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const records = req.body;
    let count = 0;

    for (const row of records) {
      if (!row.skuCode) continue;

      let sku = await prisma.skuMaster.findUnique({ where: { skuCode: row.skuCode } });
      if (!sku) {
        sku = await prisma.skuMaster.create({
          data: { skuCode: row.skuCode, name: row.name || row.skuCode, tenantId: tenant_id, hsnCode: row.hsnCode },
        });
      }

      if (row.warehouseId) {
        await prisma.inventory.create({
          data: {
            warehouseId: row.warehouseId,
            skuId: sku.id,
            binLocation: row.binLocation || 'DEFAULT',
            quantityOnHand: parseInt(row.quantity) || 0,
            quantityAvailable: parseInt(row.quantity) || 0,
          },
        });
        count++;
      }
    }

    res.json({ message: `${count} inventory items imported` });
  } catch (error) {
    res.status(500).json({ message: 'Import failed', error: String(error) });
  }
};

export const importReturns = async (req: AuthRequest, res: Response) => {
  try {
    const records = req.body;
    let count = 0;

    for (const row of records) {
      if (!row.orderId) continue;
      await prisma.return.create({
        data: {
          orderId: row.orderId,
          skuId: row.skuId || '',
          quantity: parseInt(row.quantity) || 1,
          reason: row.reason || '',
          status: 'RECEIVED',
        },
      });
      count++;
    }

    res.json({ message: `${count} returns imported` });
  } catch (error) {
    res.status(500).json({ message: 'Import failed', error: String(error) });
  }
};
