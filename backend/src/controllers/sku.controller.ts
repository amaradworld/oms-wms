import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSkus = async (req: AuthRequest, res: Response) => {
  const search = req.query.search as string | undefined;
  const where: any = { tenantId: req.user!.tenant_id };
  if (search) {
    where.OR = [
      { skuCode: { contains: search, mode: 'insensitive' } },
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

    // Build unified timeline
    const timeline: any[] = [];

    for (const inv of inventory) {
      timeline.push({ type: 'STOCK', date: '', warehouse: inv.warehouse.name, binLocation: inv.binLocation, quantityOnHand: inv.quantityOnHand, quantityAvailable: inv.quantityAvailable, quantityReserved: inv.quantityReserved });
    }

    for (const gi of grnItems) {
      timeline.push({
        type: 'GRN', date: gi.grn.createdAt, ref: gi.grn.grnNumber, warehouse: gi.grn.warehouse?.name,
        receivedQty: gi.receivedQty, acceptedQty: gi.acceptedQty, status: gi.grn.status, details: `Qty ${gi.receivedQty} (Accepted: ${gi.acceptedQty})`,
      });
    }

    for (const oi of orderItems) {
      timeline.push({
        type: 'ORDER', date: oi.order.createdAt, ref: oi.order.orderNumber, warehouse: oi.order.warehouse?.name,
        qty: oi.quantity, unitPrice: oi.unitPrice, totalAmount: oi.totalAmount, customer: oi.order.customerName, status: oi.order.orderStatus,
        details: `${oi.quantity} × ₹${oi.unitPrice} = ₹${oi.totalAmount} — ${oi.order.customerName}`,
      });
    }

    for (const pt of putawayTasks) {
      timeline.push({
        type: 'PUTAWAY', date: pt.createdAt, ref: pt.grn?.grnNumber || pt.source, source: pt.source,
        qty: pt.expectedQty, bin: pt.bin?.code, status: pt.status,
        details: `From ${pt.source} → Bin ${pt.bin?.code || 'unassigned'} (${pt.status})`,
      });
    }

    for (const pi of poItems) {
      timeline.push({
        type: 'PURCHASE_ORDER', date: pi.po.createdAt, ref: pi.po.poNumber, supplier: pi.po.supplier?.name,
        qty: pi.quantity, receivedQty: pi.receivedQty, status: pi.po.status,
        details: `Ordered ${pi.quantity}, Received ${pi.receivedQty} — from ${pi.po.supplier?.name || 'unknown'}`,
      });
    }

    for (const gi of gpItems) {
      timeline.push({
        type: 'GATEPASS', date: gi.gatepass.createdAt, ref: gi.gatepass.code, gatepassType: gi.gatepass.type,
        qty: gi.quantity, status: gi.gatepass.status,
        details: `${gi.gatepass.code} (${gi.gatepass.type}) — ${gi.quantity} qty — ${gi.gatepass.status}`,
      });
    }

    for (const si of stItems) {
      timeline.push({
        type: 'STOCK_TRANSFER', date: si.transfer.createdAt, ref: si.transfer.id.substring(0, 8),
        fromWarehouse: si.transfer.fromWarehouse.name, toWarehouse: si.transfer.toWarehouse.name,
        qty: si.quantity, status: si.transfer.status,
        details: `${si.transfer.fromWarehouse.name} → ${si.transfer.toWarehouse.name} — ${si.quantity} qty`,
      });
    }

    timeline.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    res.json({
      sku: { skuCode: sku.skuCode, name: sku.name, size: sku.size, unitType: sku.unitType, mrp: sku.mrp },
      inventory,
      timeline,
    });
  } catch (error: any) {
    console.error('SKU history error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const createSku = async (req: AuthRequest, res: Response) => {
  const { skuCode, name, styleName, size, color, brand, category, material, gender, unitType, mrp, description, hsnCode, weight, dimensions } = req.body;
  try {
    const existing = await prisma.skuMaster.findUnique({ where: { skuCode } });
    if (existing) return res.status(400).json({ message: 'SKU code already exists' });

    const sku = await prisma.skuMaster.create({
      data: {
        skuCode, name, styleName, size, color, brand, category, material, gender, unitType,
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
