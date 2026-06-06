import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSkus = async (req: AuthRequest, res: Response) => {
  const search = (req.query.search || req.query.q) as string | undefined;
  const where: any = { tenantId: req.user!.tenant_id };
  if (search) {
    where.OR = [
      { skuCode: { contains: search, mode: 'insensitive' } },
      { epcCode: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  const skus = await prisma.skuMaster.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ skus });
};

export const getSkuHistory = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const skuCode = req.params.skuCode as string;

  try {
    const sku = await prisma.skuMaster.findFirst({ where: { skuCode, tenantId } });
    if (!sku) return res.status(404).json({ message: 'SKU not found' });

    const [inventory, grnItems, orderItems, putawayTasks, poItems, gpItems, stItems] = await Promise.all([
      prisma.inventory.findMany({
        where: { skuId: sku.id, warehouse: { tenantId } },
        include: { warehouse: { select: { name: true } } },
        orderBy: { quantityAvailable: 'desc' },
      }),
      prisma.grnItem.findMany({
        where: { skuId: sku.id, grn: { tenantId } },
        include: { grn: { select: { grnNumber: true, status: true, createdAt: true, warehouse: { select: { name: true } } } } },
        orderBy: { grn: { createdAt: 'desc' } },
        take: 50,
      }),
      prisma.orderItem.findMany({
        where: { skuId: sku.id, order: { tenantId } },
        include: { order: { select: { orderNumber: true, orderStatus: true, createdAt: true, customerName: true, warehouse: { select: { name: true } } } } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 50,
      }),
      prisma.putawayTask.findMany({
        where: { skuId: sku.id, tenantId },
        include: { bin: { select: { code: true } }, grn: { select: { grnNumber: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.purchaseOrderItem.findMany({
        where: { skuId: sku.id, po: { tenantId } },
        include: { po: { select: { poNumber: true, status: true, createdAt: true, supplier: { select: { name: true } } } } },
        orderBy: { po: { createdAt: 'desc' } },
        take: 50,
      }),
      prisma.gatepassItem.findMany({
        where: { skuId: sku.id, gatepass: { tenantId } },
        include: { gatepass: { select: { code: true, type: true, status: true, createdAt: true } } },
        orderBy: { gatepass: { createdAt: 'desc' } },
        take: 50,
      }),
      prisma.stockTransferItem.findMany({
        where: { skuId: sku.id, transfer: { tenantId } },
        include: { transfer: { select: { id: true, status: true, createdAt: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } } },
        orderBy: { transfer: { createdAt: 'desc' } },
        take: 50,
      }),
    ]);

    // Build unified timeline with qtyChanged and running qtySoFar
    const raw: any[] = [];

    for (const gi of grnItems) {
      raw.push({
        type: 'GRN', date: gi.grn.createdAt, ref: gi.grn.grnNumber,
        sourceFacility: gi.grn.warehouse?.name || '', targetFacility: '',
        qty: gi.receivedQty, qtyChanged: gi.receivedQty, status: gi.grn.status,
        eventSourceId: `GRN - ${gi.grn.grnNumber}`,
      });
    }

    for (const oi of orderItems) {
      raw.push({
        type: 'ORDER', date: oi.order.createdAt, ref: oi.order.orderNumber,
        sourceFacility: oi.order.warehouse?.name || '', targetFacility: oi.order.customerName || '',
        qty: oi.quantity, qtyChanged: -oi.quantity, status: oi.order.orderStatus,
        eventSourceId: `ORDER - ${oi.order.orderNumber}`,
      });
    }

    for (const pt of putawayTasks) {
      raw.push({
        type: 'PUTAWAY', date: pt.createdAt, ref: pt.grn?.grnNumber || pt.source,
        sourceFacility: pt.source, targetFacility: pt.bin?.code || '',
        qty: pt.expectedQty, qtyChanged: 0, status: pt.status,
        eventSourceId: `PUTAWAY - ${pt.grn?.grnNumber || pt.source}`,
      });
    }

    for (const pi of poItems) {
      raw.push({
        type: 'PURCHASE_ORDER', date: pi.po.createdAt, ref: pi.po.poNumber,
        sourceFacility: pi.po.supplier?.name || '', targetFacility: '',
        qty: pi.quantity, qtyChanged: 0, status: pi.po.status,
        eventSourceId: `PO - ${pi.po.poNumber}`,
      });
    }

    for (const gi of gpItems) {
      const qtyCh = gi.gatepass.type === 'INBOUND' ? gi.quantity : -gi.quantity;
      raw.push({
        type: 'GATEPASS', date: gi.gatepass.createdAt, ref: gi.gatepass.code,
        sourceFacility: gi.gatepass.type || '', targetFacility: '',
        qty: gi.quantity, qtyChanged: qtyCh, status: gi.gatepass.status,
        eventSourceId: `GATEPASS - ${gi.gatepass.code}`,
      });
    }

    for (const si of stItems) {
      raw.push({
        type: 'STOCK_TRANSFER', date: si.transfer.createdAt, ref: si.transfer.id.substring(0, 8),
        sourceFacility: si.transfer.fromWarehouse.name, targetFacility: si.transfer.toWarehouse.name,
        qty: si.quantity, qtyChanged: 0, status: si.transfer.status,
        eventSourceId: `STOCK_TRANSFER - ${si.transfer.id.substring(0, 8)}`,
      });
    }

    // Sort oldest-first for running total
    raw.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    let running = 0;
    for (const ev of raw) {
      running += ev.qtyChanged;
      ev.qtySoFar = running;
    }

    // Reverse to newest-first for display
    const timeline = raw.reverse();

    res.json({
      sku: { skuCode: sku.skuCode, epcCode: sku.epcCode, name: sku.name, size: sku.size, unitType: sku.unitType, mrp: sku.mrp },
      inventory,
      timeline,
    });
  } catch (error: any) {
    console.error('SKU history error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

async function generateEpcCode(): Promise<string> {
  const last = await prisma.skuMaster.findFirst({
    where: { epcCode: { not: null } },
    orderBy: { epcCode: 'desc' },
    select: { epcCode: true },
  });
  let next = 1;
  if (last?.epcCode) {
    const num = parseInt(last.epcCode, 10);
    if (!isNaN(num)) next = num + 1;
  }
  return String(10000000000 + next);
}

export const createSku = async (req: AuthRequest, res: Response) => {
  const { skuCode, epcCode, name, styleName, size, color, brand, category, material, gender, unitType, mrp, description, hsnCode, weight, dimensions } = req.body;
  try {
    const existing = await prisma.skuMaster.findUnique({ where: { skuCode } });
    if (existing) return res.status(400).json({ message: 'SKU code already exists' });

    if (epcCode) {
      const epcExists = await prisma.skuMaster.findUnique({ where: { epcCode } });
      if (epcExists) return res.status(400).json({ message: 'EPC code already exists' });
    }

    const sku = await prisma.skuMaster.create({
      data: {
        skuCode,
        epcCode: epcCode || await generateEpcCode(),
        name, styleName, size, color, brand, category, material, gender, unitType,
        mrp: mrp ? parseFloat(mrp) : null,
        description, hsnCode,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        tenantId: req.user!.tenant_id,
      },
    });
    res.status(201).json(sku);
  } catch (error) {
    res.status(400).json({ message: 'Error creating SKU', error: String(error) });
  }
};
