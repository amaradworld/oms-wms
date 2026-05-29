import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

async function generateCode(tenantId: string, type: string): Promise<string> {
  const prefix = type === 'STOCK_TRANSFER' ? 'STN' : 'GP';
  const count = await prisma.gatepass.count({ where: { tenantId } });
  return `${prefix}_${count + 1}_${tenantId.slice(0, 3).toUpperCase()}`;
}

export const getGatepasses = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const where: any = { tenantId: tenant_id };
    if (status && status !== 'ALL') where.status = status;
    if (type) where.type = type;

    const gatepasses = await prisma.gatepass.findMany({
      where,
      include: {
        stockTransfer: { select: { id: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } },
        createdBy: { select: { email: true, fullName: true } },
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ gatepasses });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gatepasses', error });
  }
};

export const getGatepassById = async (req: AuthRequest, res: Response) => {
  try {
    const gatepass = await prisma.gatepass.findFirst({
      where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
      include: {
        stockTransfer: { select: { id: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } },
        createdBy: { select: { email: true, fullName: true } },
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
      },
    });
    if (!gatepass) { res.status(404).json({ message: 'Gatepass not found' }); return; }
    res.json(gatepass);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gatepass', error });
  }
};

export const createGatepass = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const { code, type, status, quantity, toParty, expectedDate, notes, stockTransferId, items } = req.body;

    const gatepassCode = code || await generateCode(tenant_id, type || 'STOCK_TRANSFER');
    const existing = await prisma.gatepass.findUnique({ where: { code: gatepassCode } });
    if (existing) { res.status(400).json({ message: `Gatepass code ${gatepassCode} already exists` }); return; }

    const gatepass = await prisma.gatepass.create({
      data: {
        tenantId: tenant_id,
        code: gatepassCode,
        type: type || 'STOCK_TRANSFER',
        status: status || 'PENDING',
        quantity: quantity || 0,
        toParty,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes,
        stockTransferId: stockTransferId || null,
        createdById: req.user!.id,
        items: items?.length ? {
          create: items.map(i => ({ skuId: i.skuId, quantity: i.quantity, inventoryType: i.inventoryType || 'GOOD_INVENTORY', shelfCode: i.shelfCode || null, unitPrice: i.unitPrice || null, batchCode: i.batchCode || null, forceAllocate: i.forceAllocate || false })),
        } : undefined,
      },
      include: {
        stockTransfer: { select: { id: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } },
        createdBy: { select: { email: true, fullName: true } },
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
      },
    });

    res.status(201).json(gatepass);
  } catch (error) {
    res.status(400).json({ message: 'Error creating gatepass', error: String(error) });
  }
};

export const createGatepassFromStockTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const transferId = req.params.id as string;

    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId: tenant_id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { sku: true } },
      },
    });
    if (!transfer) { res.status(404).json({ message: 'Stock transfer not found' }); return; }

    const existingGp = await prisma.gatepass.findFirst({ where: { stockTransferId: transferId } });
    if (existingGp) { res.status(400).json({ message: `Gatepass ${existingGp.code} already exists for this transfer` }); return; }

    const code = await generateCode(tenant_id, 'STOCK_TRANSFER');
    const totalQty = transfer.items.reduce((s, i) => s + i.quantity, 0);

    const gatepass = await prisma.gatepass.create({
      data: {
        tenantId: tenant_id,
        code,
        type: 'STOCK_TRANSFER',
        status: 'PENDING',
        quantity: totalQty,
        toParty: transfer.toWarehouse?.name || null,
        notes: `Auto-created from stock transfer`,
        stockTransferId: transfer.id,
        createdById: req.user!.id,
        items: {
          create: transfer.items.map(i => ({ skuId: i.skuId, quantity: i.quantity })),
        },
      },
      include: {
        stockTransfer: { select: { id: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } },
        createdBy: { select: { email: true, fullName: true } },
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
      },
    });

    res.status(201).json(gatepass);
  } catch (error) {
    res.status(400).json({ message: 'Error creating gatepass from transfer', error: String(error) });
  }
};

export const updateGatepassStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const { status } = req.body;
    const id = req.params.id as string;

    const gp = await prisma.gatepass.findFirst({ where: { id, tenantId: tenant_id } });
    if (!gp) { res.status(404).json({ message: 'Gatepass not found' }); return; }

    const gatepass = await prisma.gatepass.update({
      where: { id },
      data: { status },
      include: {
        stockTransfer: { select: { id: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } },
        createdBy: { select: { email: true, fullName: true } },
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
      },
    });

    // If gatepass is dispatched, also update linked stock transfer status
    if (status === 'DISPATCHED' && gp.stockTransferId) {
      await prisma.stockTransfer.update({
        where: { id: gp.stockTransferId },
        data: { status: 'IN_TRANSIT' },
      });
    }

    res.json(gatepass);
  } catch (error) {
    res.status(400).json({ message: 'Error updating gatepass', error });
  }
};

export const scanGatepassItem = async (req: AuthRequest, res: Response) => {
  try {
    const { tenant_id } = req.user!;
    const id = req.params.id as string;
    const { skuCode } = req.body;

    const gp = await prisma.gatepass.findFirst({
      where: { id, tenantId: tenant_id },
      include: { items: { include: { sku: true } } },
    });
    if (!gp) { res.status(404).json({ message: 'Gatepass not found' }); return; }

    const gpItem = gp.items.find(i => i.sku.skuCode === skuCode);
    if (!gpItem) { res.status(404).json({ message: `SKU ${skuCode} not found in gatepass items` }); return; }

    if (gpItem.scannedQty >= gpItem.quantity) { res.status(400).json({ message: `${skuCode} already fully scanned` }); return; }

    const updated = await prisma.gatepassItem.update({
      where: { id: gpItem.id },
      data: { scannedQty: { increment: 1 }, status: gpItem.scannedQty + 1 >= gpItem.quantity ? 'SCANNED' : 'PARTIAL' },
      include: { sku: { select: { skuCode: true, name: true } } },
    });

    // Also update stock transfer item received qty if linked
    if (gp.stockTransferId) {
      const stItem = await prisma.stockTransferItem.findFirst({
        where: { transferId: gp.stockTransferId, skuId: gpItem.skuId },
      });
      if (stItem) {
        await prisma.stockTransferItem.update({
          where: { id: stItem.id },
          data: { receivedQty: { increment: 1 } },
        });
      }
    }

    // If all items fully scanned, mark gatepass as RECEIVED
    const allItems = await prisma.gatepassItem.findMany({ where: { gatepassId: id } });
    const allScanned = allItems.every(i => i.scannedQty >= i.quantity);
    if (allScanned) {
      await prisma.gatepass.update({ where: { id }, data: { status: 'RECEIVED' } });
    }

    res.json({ message: `Scanned ${skuCode}`, item: updated, allScanned });
  } catch (error) {
    res.status(400).json({ message: 'Error scanning item', error });
  }
};
