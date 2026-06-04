import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../services/audit.service';

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

  for (const item of items) {
    await prisma.grnItem.update({
      where: { id: item.grnItemId },
      data: {
        qcStatus: item.qcStatus,
        qcNotes: item.qcNotes || null,
        acceptedQty: item.acceptedQty ?? 0,
        rejectedQty: item.rejectedQty ?? 0,
      },
    });
  }

  const updatedItems = await prisma.grnItem.findMany({ where: { grnId: id } });
  const allQcDone = updatedItems.every(i => i.qcStatus === 'PASSED' || i.qcStatus === 'FAILED');
  const anyFailed = updatedItems.some(i => i.qcStatus === 'FAILED');

  const totalAccepted = updatedItems.reduce((s, i) => s + i.acceptedQty, 0);
  const totalRejected = updatedItems.reduce((s, i) => s + i.rejectedQty, 0);

  await prisma.grn.update({
    where: { id },
    data: {
      status: allQcDone ? (anyFailed ? 'QC_FAILED' : 'QC_PENDING') : 'RECEIVING',
      acceptedQty: totalAccepted,
      rejectedQty: totalRejected,
    },
  });

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

  await prisma.grn.update({ where: { id: grn.id }, data: { status: 'APPROVED' } });

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


