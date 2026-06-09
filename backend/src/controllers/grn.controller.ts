import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../services/audit.service';
import { logProductivity, durationMinutes } from '../services/productivityLogger.service';

export const getGrns = async (req: AuthRequest, res: Response) => {
  const where: any = { tenantId: req.user!.tenant_id };
  const status = req.query.status as string;
  if (status) where.status = status;
  if (req.query.poId) where.poId = req.query.poId as string;

  const grns = await prisma.grn.findMany({
    where,
    include: {
      purchaseOrder: { select: { poNumber: true } },
      warehouse: { select: { name: true, displayName: true } },
      items: { include: { sku: { select: { skuCode: true, name: true, size: true } } } },
      putawayTasks: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(grns);
};

export const getGrnDetail = async (req: AuthRequest, res: Response) => {
  const grn = await prisma.grn.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      purchaseOrder: { select: { poNumber: true, supplier: { select: { name: true } } } },
      warehouse: { select: { name: true, displayName: true } },
      items: { include: { sku: { select: { skuCode: true, name: true, size: true, unitType: true } } } },
      putawayTasks: { include: { sku: { select: { skuCode: true, name: true } }, bin: { select: { id: true, code: true } } } },
    },
  });
  if (!grn) return res.status(404).json({ message: 'GRN not found' });
  res.json(grn);
};

export const createGrn = async (req: AuthRequest, res: Response) => {
  const { poId, vendorInvoiceNo, items } = req.body;
  const tenantId = req.user!.tenant_id;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, tenantId },
    include: { items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  if (!po) return res.status(404).json({ message: 'PO not found' });

  const grnCount = await prisma.grn.count({ where: { tenantId } });
  const grnNumber = `GRN-${String(grnCount + 1).padStart(5, '0')}`;

  const totalQty = items.reduce((sum, i) => sum + (i.receivedQty || 0), 0);

  const grn = await prisma.grn.create({
    data: {
      tenantId,
      poId,
      warehouseId: po.warehouseId,
      grnNumber,
      vendorInvoiceNo: vendorInvoiceNo || null,
      status: 'RECEIVING',
      totalQty,
      createdById: req.user!.id,
      items: {
        create: items.map(i => ({
          poItemId: i.poItemId,
          skuId: i.skuId,
          expectedQty: i.expectedQty || 0,
          receivedQty: i.receivedQty || 0,
          batchNo: i.batchNo || null,
          expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
          manufacturingDate: i.manufacturingDate ? new Date(i.manufacturingDate) : null,
          mrp: i.mrp ?? null,
          qcStatus: 'PENDING',
        })),
      },
    },
    include: {
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
      purchaseOrder: { select: { poNumber: true } },
    },
  });

  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'RECEIVING' } });

  res.status(201).json(grn);
  logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', entityType: 'GRN', entityId: grn.id, newValue: { grnNumber: grn.grnNumber, poId, vendorInvoiceNo, totalQty } });
};

export const qcGrnItem = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { items } = req.body; // [{ grnItemId, qcStatus: 'PASSED'|'FAILED', qcNotes, acceptedQty, rejectedQty }]

  const grn = await prisma.grn.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
    include: { items: true },
  });
  if (!grn) return res.status(404).json({ message: 'GRN not found' });

  const now = new Date();
  const isFirstQc = !grn.qcStartedAt;
  for (const item of items) {
    // Idempotency: skip if QC already completed for this item
    const existingItem = await prisma.grnItem.findUnique({ where: { id: item.grnItemId }, select: { qcStatus: true } });
    if (existingItem && (existingItem.qcStatus === 'PASSED' || existingItem.qcStatus === 'FAILED')) {
      continue;
    }

    await prisma.grnItem.update({
      where: { id: item.grnItemId },
      data: {
        qcStatus: item.qcStatus,
        qcNotes: item.qcNotes || null,
        acceptedQty: item.acceptedQty ?? 0,
        rejectedQty: item.rejectedQty ?? 0,
        qcAt: now,
      },
    });

    // Move QC_FAILED items to quarantine bin
    if (item.qcStatus === 'FAILED' && item.rejectedQty && item.rejectedQty > 0) {
      const grnItem = await prisma.grnItem.findUnique({ where: { id: item.grnItemId }, select: { skuId: true } });
      if (grnItem) {
        await prisma.inventory.upsert({
          where: { warehouseId_skuId_binLocation: { warehouseId: grn.warehouseId, skuId: grnItem.skuId, binLocation: 'QUARANTINE' } },
          update: { quantityOnHand: { increment: item.rejectedQty } },
          create: {
            warehouseId: grn.warehouseId, skuId: grnItem.skuId, binLocation: 'QUARANTINE',
            quantityOnHand: item.rejectedQty, quantityAvailable: 0, // quarantine items not available for allocation
            type: 'Quarantine', status: 'ON_HOLD',
          },
        });
      }
    }
  }

  const updatedItems = await prisma.grnItem.findMany({ where: { grnId: id } });
  const allQcDone = updatedItems.every(i => i.qcStatus === 'PASSED' || i.qcStatus === 'FAILED');
  const anyFailed = updatedItems.some(i => i.qcStatus === 'FAILED');

  const totalAccepted = updatedItems.reduce((s, i) => s + i.acceptedQty, 0);
  const totalRejected = updatedItems.reduce((s, i) => s + i.rejectedQty, 0);

  const grnUpdate: any = {
    status: allQcDone ? (anyFailed ? 'QC_FAILED' : 'QC_PENDING') : 'RECEIVING',
    acceptedQty: totalAccepted,
    rejectedQty: totalRejected,
  };
  if (isFirstQc) grnUpdate.qcStartedAt = now;
  if (allQcDone && !grn.qcCompletedAt) grnUpdate.qcCompletedAt = now;

  await prisma.grn.update({ where: { id }, data: grnUpdate });

  if (allQcDone) {
    await logProductivity({
      tenantId: req.user!.tenant_id,
      warehouseId: grn.warehouseId,
      userId: req.user!.id,
      activity: 'GRN',
      entityType: 'GRN',
      entityId: id,
      quantity: updatedItems.length,
      durationMin: durationMinutes(grn.qcStartedAt || grn.createdAt, now),
    });
  }

  res.json({ message: 'QC updated' });
  logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'QC', entityType: 'GRN', entityId: id, newValue: { qcResults: items } });
};

export const approveGrn = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const grn = await prisma.grn.findFirst({
    where: { id: req.params.id as string, tenantId },
    include: {
      items: { where: { qcStatus: { in: ['PASSED', 'PENDING'] } } },
      purchaseOrder: true,
    },
  });
  if (!grn) return res.status(404).json({ message: 'GRN not found' });
  if (grn.status === 'APPROVED') return res.status(400).json({ message: 'GRN already approved' });

  // Update inventory for accepted items
  for (const item of grn.items) {
    const acceptedQty = item.acceptedQty > 0 ? item.acceptedQty : item.receivedQty;
    if (acceptedQty > 0) {
      await prisma.inventory.upsert({
        where: { warehouseId_skuId_binLocation: { warehouseId: grn.warehouseId, skuId: item.skuId, binLocation: 'GRN-RECEIVED' } },
        update: { quantityOnHand: { increment: acceptedQty }, quantityAvailable: { increment: acceptedQty } },
        create: { warehouseId: grn.warehouseId, skuId: item.skuId, binLocation: 'GRN-RECEIVED', quantityOnHand: acceptedQty, quantityAvailable: acceptedQty },
      });

      // Update PO item received qty
      const poItem = await prisma.purchaseOrderItem.findUnique({ where: { id: item.poItemId } });
      if (poItem) {
        const newReceived = poItem.receivedQty + acceptedQty;
        await prisma.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: { receivedQty: newReceived, status: newReceived >= poItem.quantity ? 'RECEIVED' : 'PARTIAL' },
        });
      }
    }
  }

  // Update PO status
  const poItems = await prisma.purchaseOrderItem.findMany({ where: { poId: grn.poId } });
  const allReceived = poItems.every(i => i.status === 'RECEIVED');
  await prisma.purchaseOrder.update({
    where: { id: grn.poId },
    data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
  });

  // Create putaway tasks
  const tasks = grn.items
    .filter(item => (item.acceptedQty > 0 ? item.acceptedQty : item.receivedQty) > 0)
    .map(item => ({
      tenantId,
      warehouseId: grn.warehouseId,
      source: 'PUTAWAY_GRN_ITEM',
      sourceId: grn.id,
      grnId: grn.id,
      skuId: item.skuId,
      expectedQty: item.acceptedQty > 0 ? item.acceptedQty : item.receivedQty,
      createdById: req.user!.id,
    }));

  if (tasks.length) {
    await prisma.putawayTask.createMany({ data: tasks });
  }

  await prisma.grn.update({ where: { id: grn.id }, data: { status: 'APPROVED', approvedAt: new Date() } });

  res.json({ message: 'GRN approved. Inventory updated. Putaway tasks created.', tasksCreated: tasks.length });
  logAudit({ tenantId, userId: req.user!.id, action: 'APPROVE', entityType: 'GRN', entityId: grn.id, newValue: { status: 'APPROVED', tasksCreated: tasks.length } });
};

export const rejectGrn = async (req: AuthRequest, res: Response) => {
  const grn = await prisma.grn.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
  });
  if (!grn) return res.status(404).json({ message: 'GRN not found' });

  await prisma.grn.update({ where: { id: grn.id }, data: { status: 'REJECTED' } });
  res.json({ message: 'GRN rejected' });
  logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'REJECT', entityType: 'GRN', entityId: req.params.id as string, newValue: { status: 'REJECTED' } });
};

export const scanReceiveGrnItem = async (req: AuthRequest, res: Response) => {
  const grnId = req.params.id as string;
  const { skuCode, epcCode, qcStatus } = req.body; // qcStatus: 'PASSED' | 'FAILED'

  const code = skuCode || epcCode;
  if (!code) return res.status(400).json({ message: 'skuCode or epcCode required' });
  if (!qcStatus || !['PASSED', 'FAILED'].includes(qcStatus)) return res.status(400).json({ message: 'qcStatus must be PASSED or FAILED' });

  const grn = await prisma.grn.findFirst({
    where: { id: grnId, tenantId: req.user!.tenant_id },
    include: { items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  if (!grn) return res.status(404).json({ message: 'GRN not found' });
  if (grn.status === 'APPROVED' || grn.status === 'REJECTED') return res.status(400).json({ message: 'GRN already approved/rejected' });

  const grnItem = grn.items.find(i => i.sku.skuCode === code || i.sku.skuCode === epcCode);
  if (!grnItem) return res.status(404).json({ message: `SKU ${code} not found in this GRN` });

  const isPass = qcStatus === 'PASSED';
  const now = new Date();
  await prisma.grnItem.update({
    where: { id: grnItem.id },
    data: {
      receivedQty: { increment: 1 },
      qcStatus: isPass ? 'PASSED' : 'FAILED',
      acceptedQty: isPass ? { increment: 1 } : undefined,
      rejectedQty: isPass ? undefined : { increment: 1 },
      receivedAt: now,
      qcAt: now,
    },
  });

  // Move QC_FAILED items to quarantine bin
  if (!isPass) {
    await prisma.inventory.upsert({
      where: { warehouseId_skuId_binLocation: { warehouseId: grn.warehouseId, skuId: grnItem.skuId, binLocation: 'QUARANTINE' } },
      update: { quantityOnHand: { increment: 1 } },
      create: {
        warehouseId: grn.warehouseId, skuId: grnItem.skuId, binLocation: 'QUARANTINE',
        quantityOnHand: 1, quantityAvailable: 0,
        type: 'Quarantine', status: 'ON_HOLD',
      },
    });
  }

  const updatedItems = await prisma.grnItem.findMany({ where: { grnId } });
  const totalReceived = updatedItems.reduce((s, i) => s + i.receivedQty, 0);
  const totalAccepted = updatedItems.reduce((s, i) => s + i.acceptedQty, 0);
  const totalRejected = updatedItems.reduce((s, i) => s + i.rejectedQty, 0);
  const allReceived = updatedItems.every(i => i.receivedQty >= i.expectedQty);
  const allQcDone = updatedItems.every(i => i.qcStatus === 'PASSED' || i.qcStatus === 'FAILED');
  const anyFailed = updatedItems.some(i => i.qcStatus === 'FAILED');

  const grnUpdate: any = {
    totalQty: totalReceived,
    acceptedQty: totalAccepted,
    rejectedQty: totalRejected,
    status: allQcDone ? (anyFailed ? 'QC_FAILED' : 'QC_PENDING') : allReceived ? 'QC_PENDING' : 'RECEIVING',
  };
  if (!grn.receivedAt) grnUpdate.receivedAt = now;
  if (isFirstQcScan(grn) && grnUpdate.status !== 'RECEIVING') grnUpdate.qcStartedAt = now;

  await prisma.grn.update({ where: { id: grnId }, data: grnUpdate });

  res.json({
    message: `Scanned ${grnItem.sku.skuCode} — marked as ${qcStatus}`,
    item: { skuCode: grnItem.sku.skuCode, name: grnItem.sku.name, qcStatus, receivedQty: grnItem.receivedQty + 1 },
  });
  logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'SCAN_RECEIVE', entityType: 'GRN', entityId: grnId, newValue: { skuCode: grnItem.sku.skuCode, qcStatus } });
};

function isFirstQcScan(grn: any): boolean {
  return !grn.qcStartedAt;
}


