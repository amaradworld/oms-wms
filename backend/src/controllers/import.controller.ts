import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import multer from 'multer';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export { upload };

export const importInventory = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const warehouseId = (req.query.warehouseId as string) || '';
    if (!warehouseId) return res.status(400).json({ message: 'warehouseId query param is required' });

    const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
    if (!warehouse) return res.status(400).json({ message: 'Warehouse/facility not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'CSV file is required' });

    const csv = file.buffer.toString('utf-8');
    const records: any[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    let count = 0;

    for (const row of records) {
      const skuCode = row.skuCode || row.SKU || '';
      if (!skuCode) continue;

      let sku = await prisma.skuMaster.findUnique({ where: { skuCode } });
      if (!sku) {
        sku = await prisma.skuMaster.create({
          data: { skuCode, name: row.name || row.Product || skuCode, tenantId, hsnCode: row.hsnCode || '' },
        });
      }

      const qty = parseInt(row.quantityOnHand || row.qtyOnHand || row.quantity || '0', 10) || 0;
      const avail = parseInt(row.quantityAvailable || row.qtyAvailable || row.quantity || String(qty), 10) || qty;
      const bin = row.binLocation || row.Bin || 'DEFAULT';

      await prisma.inventory.upsert({
        where: { warehouseId_skuId_binLocation: { warehouseId, skuId: sku.id, binLocation: bin } },
        update: { quantityOnHand: qty, quantityAvailable: avail },
        create: { warehouseId, skuId: sku.id, binLocation: bin, quantityOnHand: qty, quantityAvailable: avail },
      });
      count++;
    }

    res.json({ message: `${count} inventory items imported to ${warehouse.name}` });
  } catch (error: any) {
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
};

export const importOrders = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'CSV file is required' });

    const csv = file.buffer.toString('utf-8');
    const records: any[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    let count = 0;

    for (const row of records) {
      const orderNumber = row.orderNumber || row.order_number || '';
      if (!orderNumber) continue;

      const existing = await prisma.order.findUnique({ where: { orderNumber } });
      if (existing) continue;

      await prisma.order.create({
        data: {
          orderNumber,
          tenantId,
          customerName: row.customerName || row.customer_name || 'Unknown',
          shippingAddress: row.shippingAddress || row.shipping_address || '',
          source: row.source || row.Source || 'Manual',
          orderStatus: row.orderStatus || row.order_status || 'PENDING',
          items: {
            create: [{ skuId: row.skuId || 'SKU-DEFAULT', quantity: parseInt(row.quantity || '1', 10) || 1, unitPrice: parseFloat(row.price || '0') || 0, totalAmount: parseFloat(row.total || '0') || 0 }],
          },
        },
      });
      count++;
    }

    res.json({ message: `${count} orders imported` });
  } catch (error: any) {
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
};

export const importReturns = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'CSV file is required' });

    const csv = file.buffer.toString('utf-8');
    const records: any[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    let count = 0;

    for (const row of records) {
      const orderId = row.orderId || row.order_id || '';
      if (!orderId) continue;

      await prisma.return.create({
        data: {
          orderId,
          skuId: row.skuId || '',
          quantity: parseInt(row.quantity || '1', 10) || 1,
          reason: row.reason || '',
          status: 'RECEIVED',
        },
      });
      count++;
    }

    res.json({ message: `${count} returns imported` });
  } catch (error: any) {
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
};
