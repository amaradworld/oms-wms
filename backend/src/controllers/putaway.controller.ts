import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit, logUpdateAudit, captureSnapshot } from '../services/audit.service';
import { logProductivity, durationMinutes } from '../services/productivityLogger.service';

const SOURCE_BIN_MAP: Record<string, string> = {
  PUTAWAY_GRN_ITEM: 'GRN-RECEIVED',
  PUTAWAY_CANCELLED_ITEM: 'CANCELLED',
  PUTAWAY_GATEPASS_ITEM: 'GATEPASS-RECEIVED',
  PUTAWAY_RECEIVED_RETURNS: 'RETURNS-RECEIVED',
  PUTAWAY_PICKLIST_ITEM: 'PICKLIST',
};

const PUTAWAY_SOURCES = [
  'PUTAWAY_GRN_ITEM',
  'PUTAWAY_CANCELLED_ITEM',
  'PUTAWAY_GATEPASS_ITEM',
  'PUTAWAY_SHELF_TRANSFER',
  'PUTAWAY_PICKLIST_ITEM',
  'PUTAWAY_RECEIVED_RETURNS',
];

export const getPutawaySources = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const type = req.query.type as string;
  const warehouseId = req.query.warehouseId as string;

  if (!type || !PUTAWAY_SOURCES.includes(type)) {
    return res.status(400).json({ message: 'Invalid putaway source type' });
  }

  try {
    switch (type) {
      case 'PUTAWAY_GRN_ITEM': {
        // Approved GRNs with pending putaway tasks in this warehouse
        const grns = await prisma.grn.findMany({
          where: {
            tenantId,
            status: 'APPROVED',
            ...(warehouseId ? { warehouseId } : {}),
          },
          include: {
            items: {
              where: { qcStatus: { in: ['PASSED', 'PENDING'] } },
              include: { sku: { select: { skuCode: true, name: true, size: true } } },
            },
            purchaseOrder: { select: { poNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        // Return items that don't already have pending/in-progress/completed putaway tasks
        const result = [];
        for (const grn of grns) {
          const existingTasks = await prisma.putawayTask.findMany({
            where: { grnId: grn.id, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } },
            select: { id: true, skuId: true, expectedQty: true, status: true },
          });
          const activeTaskSkus = new Set(existingTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').map(t => t.skuId));
          const completedSkus = new Set(existingTasks.filter(t => t.status === 'COMPLETED').map(t => t.skuId));
          for (const item of grn.items) {
            if (completedSkus.has(item.skuId)) continue; // fully completed
            if (activeTaskSkus.has(item.skuId)) continue; // already has pending/in-progress task — skip to prevent dupes
            result.push({
              sourceId: grn.id,
              sourceRef: `GRN #${grn.grnNumber} (PO: ${grn.purchaseOrder?.poNumber})`,
              skuId: item.skuId,
              skuCode: item.sku.skuCode,
              skuName: item.sku.name,
              skuSize: item.sku.size,
              expectedQty: item.acceptedQty > 0 ? item.acceptedQty : item.receivedQty,
              pendingQty: item.acceptedQty > 0 ? item.acceptedQty : item.receivedQty,
              existingTaskId: null,
            });
          }
        }
        return res.json(result);
      }

      case 'PUTAWAY_CANCELLED_ITEM': {
        // Cancelled orders with items that need to be returned to bin
        const orders = await prisma.order.findMany({
          where: {
            tenantId,
            orderStatus: 'CANCELLED',
            ...(warehouseId ? { warehouseId } : {}),
          },
          include: {
            items: {
              include: { sku: { select: { skuCode: true, name: true, size: true } } },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });
        const result = [];
        for (const order of orders) {
          for (const item of order.items) {
            result.push({
              sourceId: order.id,
              sourceRef: `Order #${order.orderNumber} (CANCELLED)`,
              skuId: item.skuId,
              skuCode: item.sku.skuCode,
              skuName: item.sku.name,
              skuSize: item.sku.size,
              expectedQty: item.quantity,
              pendingQty: item.quantity,
              existingTaskId: null,
            });
          }
        }
        return res.json(result);
      }

      case 'PUTAWAY_GATEPASS_ITEM': {
        // Received gatepasses (inbound stock transfers or returns via gatepass)
        const gatepasses = await prisma.gatepass.findMany({
          where: {
            tenantId,
            status: 'RECEIVED',
            ...(warehouseId ? { createdBy: { warehouseId } } : {}),
          },
          include: {
            items: {
              include: { sku: { select: { skuCode: true, name: true, size: true } } },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });
        const result = [];
        for (const gp of gatepasses) {
          for (const item of gp.items) {
            result.push({
              sourceId: gp.id,
              sourceRef: `Gatepass #${gp.code} (${gp.type})`,
              skuId: item.skuId,
              skuCode: item.sku.skuCode,
              skuName: item.sku.name,
              skuSize: item.sku.size,
              expectedQty: item.quantity,
              pendingQty: item.quantity,
              existingTaskId: null,
            });
          }
        }
        return res.json(result);
      }

      case 'PUTAWAY_RECEIVED_RETURNS': {
        // Customer returns received and QC passed
        const returns = await prisma.return.findMany({
          where: {
            status: { in: ['QC_PASSED', 'RECEIVED'] },
            order: { tenantId, ...(warehouseId ? { warehouseId } : {}) },
          },
          include: {
            sku: { select: { skuCode: true, name: true, size: true } },
            order: { select: { orderNumber: true } },
          },
          orderBy: { receivedAt: 'desc' },
          take: 50,
        });
        const result = returns.map(r => ({
          sourceId: r.id,
          sourceRef: `Return from Order #${r.order?.orderNumber}`,
          skuId: r.skuId,
          skuCode: r.sku.skuCode,
          skuName: r.sku.name,
          skuSize: r.sku.size,
          expectedQty: r.quantity,
          pendingQty: r.quantity,
          existingTaskId: null,
        }));
        return res.json(result);
      }

      case 'PUTAWAY_SHELF_TRANSFER': {
        // Completed stock transfers (received by destination warehouse)
        const transfers = await prisma.stockTransfer.findMany({
          where: {
            tenantId,
            status: 'RECEIVED',
            toWarehouseId: warehouseId || undefined,
          },
          include: {
            items: {
              include: { sku: { select: { skuCode: true, name: true, size: true } } },
            },
            fromWarehouse: { select: { name: true } },
          },
          orderBy: { receivedAt: 'desc' },
          take: 50,
        });
        const result = [];
        for (const t of transfers) {
          for (const item of t.items) {
            const pendingQty = item.quantity - item.receivedQty;
            if (pendingQty > 0) {
              result.push({
                sourceId: t.id,
                sourceRef: `Stock Transfer from ${t.fromWarehouse?.name || 'Unknown'}`,
                skuId: item.skuId,
                skuCode: item.sku.skuCode,
                skuName: item.sku.name,
                skuSize: item.sku.size,
                expectedQty: item.quantity,
                pendingQty,
                existingTaskId: null,
              });
            }
          }
        }
        return res.json(result);
      }

      case 'PUTAWAY_PICKLIST_ITEM': {
        // Picklist items that were picked but order was cancelled or needs re-shelving
        const picklists = await prisma.picklist.findMany({
          where: {
            warehouseId: warehouseId || undefined,
            status: { in: ['PICKED', 'PARTIAL'] },
          },
          include: {
            warehouse: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        // Get orders in those picklists via pick waves
        const result = [];
        for (const pl of picklists) {
          const waves = await prisma.pickWave.findMany({
            where: { warehouseId: pl.warehouseId, status: { not: 'COMPLETED' } },
            include: {
              orders: {
                include: {
                  order: {
                    include: {
                      items: {
                        include: { sku: { select: { skuCode: true, name: true, size: true } } },
                      },
                    },
                    where: { orderStatus: { in: ['CANCELLED', 'RETURNED'] } },
                  },
                },
              },
            },
          });
          for (const wave of waves) {
            for (const wo of wave.orders) {
              for (const item of wo.order.items) {
                result.push({
                  sourceId: wo.order.id,
                  sourceRef: `Picklist #${pl.id} - Order ${wo.order.orderNumber}`,
                  skuId: item.skuId,
                  skuCode: item.sku.skuCode,
                  skuName: item.sku.name,
                  skuSize: item.sku.size,
                  expectedQty: item.quantity,
                  pendingQty: item.quantity,
                  existingTaskId: null,
                });
              }
            }
          }
        }
        return res.json(result);
      }

      default:
        return res.json([]);
    }
  } catch (error: any) {
    console.error('Get putaway sources error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const createPutawayTask = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { source, warehouseId, items } = req.body; // items: [{ skuId, expectedQty, sourceId }]

  if (!source || !PUTAWAY_SOURCES.includes(source)) {
    return res.status(400).json({ message: 'Invalid putaway source type' });
  }
  if (!warehouseId) return res.status(400).json({ message: 'Warehouse is required' });
  if (!items || items.length === 0) return res.status(400).json({ message: 'At least one item required' });

  try {
    // Prevent duplicates: check for existing tasks for same SKU+sourceId+warehouseId
    const existingTasks = await prisma.putawayTask.findMany({
      where: {
        warehouseId,
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: items.map((item: any) => ({
          skuId: item.skuId,
          sourceId: item.sourceId || null,
        })),
      },
      select: { id: true, skuId: true, sourceId: true, status: true },
    });

    const existingMap = new Map(existingTasks.map(t => [`${t.skuId}:${t.sourceId || ''}`, t]));
    const skipped: string[] = [];
    const toCreate: any[] = [];

    for (const item of items) {
      const key = `${item.skuId}:${item.sourceId || ''}`;
      if (existingMap.has(key)) {
        const existing = existingMap.get(key)!;
        skipped.push(`${item.skuId} (already ${existing.status} in task ${existing.id.slice(0, 8)})`);
      } else {
        toCreate.push({
          tenantId,
          warehouseId,
          source,
          sourceId: item.sourceId || null,
          grnId: source === 'PUTAWAY_GRN_ITEM' ? item.sourceId : null,
          skuId: item.skuId,
          expectedQty: item.expectedQty,
          createdById: req.user!.id,
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.putawayTask.createMany({ data: toCreate });
    }

    const msg = [
      toCreate.length > 0 ? `${toCreate.length} putaway task(s) created` : '',
      skipped.length > 0 ? `${skipped.length} skipped (already pending/in-progress): ${skipped.join(', ')}` : '',
    ].filter(Boolean).join('. ');

    res.status(201).json({ message: msg || 'All items already have pending putaway tasks', created: toCreate.length, skipped: skipped.length });
    if (toCreate.length > 0) {
      logAudit({ tenantId, userId: req.user!.id, action: 'CREATE', entityType: 'PutawayTask', newValue: { source, warehouseId, itemCount: toCreate.length, skippedCount: skipped.length } });
    }
  } catch (error: any) {
    console.error('Create putaway task error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const getPutawayTasks = async (req: AuthRequest, res: Response) => {
  const where: any = { tenantId: req.user!.tenant_id };
  const status = req.query.status as string;
  if (status) where.status = { in: status.split(',') };
  if (req.query.warehouseId) where.warehouseId = req.query.warehouseId as string;
  const source = req.query.source as string;
  if (source) where.source = source;

  const tasks = await prisma.putawayTask.findMany({
    where,
    include: {
      sku: { select: { skuCode: true, name: true, size: true } },
      grn: { select: { grnNumber: true } },
      bin: { select: { id: true, code: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(tasks);
};

export const assignBinToTask = async (req: AuthRequest, res: Response) => {
  const { binId } = req.body;
  const before = await captureSnapshot('PutawayTask', req.params.id as string);
  const task = await prisma.putawayTask.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
  });
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const bin = await prisma.binLocation.findFirst({
    where: { id: binId, warehouseId: task.warehouseId, tenantId: req.user!.tenant_id },
  });
  if (!bin) return res.status(400).json({ message: 'Bin not found in this warehouse' });

  const now = new Date();
  const updated = await prisma.putawayTask.update({
    where: { id: task.id },
    data: {
      binId,
      status: 'IN_PROGRESS',
      assignedTo: req.user!.id,
      assignedAt: now,
      startedAt: task.startedAt || now,
    },
  });

  res.json({ message: 'Bin assigned to putaway task', task: updated });
  if (before) {
    await logUpdateAudit({
      tenantId: req.user!.tenant_id,
      userId: req.user!.id,
      action: 'ASSIGN_BIN',
      entityType: 'PutawayTask',
      entityId: task.id,
      before,
      after: { ...before, ...updated } as any,
    });
  }
};

export const completePutaway = async (req: AuthRequest, res: Response) => {
  const before = await captureSnapshot('PutawayTask', req.params.id as string);
  const task = await prisma.putawayTask.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: { bin: true },
  });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!task.binId) return res.status(400).json({ message: 'Assign bin first' });

  try {
    const skuId = task.skuId;
    const warehouseId = task.warehouseId;
    const acceptedQty = task.expectedQty - task.completedQty;
    const now = new Date();

    if (acceptedQty <= 0) {
      const updated = await prisma.putawayTask.update({
        where: { id: task.id },
        data: { completedAt: now, status: 'COMPLETED' },
      });
      if (before) {
        await logUpdateAudit({
          tenantId: req.user!.tenant_id, userId: req.user!.id,
          action: 'COMPLETE', entityType: 'PutawayTask', entityId: task.id,
          before, after: { ...before, ...updated } as any,
        });
      }
      return res.json({ message: 'Putaway already completed' });
    }

    if (task.source === 'PUTAWAY_SHELF_TRANSFER') {
      await prisma.inventory.upsert({
        where: { warehouseId_skuId_binLocation: { warehouseId, skuId, binLocation: task.bin!.code } },
        update: { quantityOnHand: { increment: acceptedQty }, quantityAvailable: { increment: acceptedQty } },
        create: { warehouseId, skuId, binLocation: task.bin!.code, quantityOnHand: acceptedQty, quantityAvailable: acceptedQty },
      });
    } else {
      const sourceBin = SOURCE_BIN_MAP[task.source];
      if (sourceBin) {
        await prisma.inventory.update({
          where: { warehouseId_skuId_binLocation: { warehouseId, skuId, binLocation: sourceBin } },
          data: { quantityOnHand: { decrement: acceptedQty }, quantityAvailable: { decrement: acceptedQty } },
        });
      }
      await prisma.inventory.upsert({
        where: { warehouseId_skuId_binLocation: { warehouseId, skuId, binLocation: task.bin!.code } },
        update: { quantityOnHand: { increment: acceptedQty }, quantityAvailable: { increment: acceptedQty } },
        create: { warehouseId, skuId, binLocation: task.bin!.code, quantityOnHand: acceptedQty, quantityAvailable: acceptedQty },
      });
    }

    const updated = await prisma.putawayTask.update({
      where: { id: task.id },
      data: {
        completedQty: { increment: acceptedQty },
        completedAt: now,
        status: 'COMPLETED',
        startedAt: task.startedAt || now,
      },
    });

    await logProductivity({
      tenantId: req.user!.tenant_id,
      warehouseId: task.warehouseId,
      userId: req.user!.id,
      activity: 'PUTAWAY',
      entityType: 'PutawayTask',
      entityId: task.id,
      quantity: acceptedQty,
      durationMin: durationMinutes(task.startedAt || task.assignedAt || task.createdAt, now),
    });

    res.json({ message: 'Putaway completed. Inventory moved to bin.' });
    if (before) {
      await logUpdateAudit({
        tenantId: req.user!.tenant_id, userId: req.user!.id,
        action: 'COMPLETE', entityType: 'PutawayTask', entityId: task.id,
        before, after: { ...before, ...updated } as any,
      });
    }
  } catch (error: any) {
    console.error('Complete putaway error:', error);
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};
