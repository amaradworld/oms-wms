import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logAudit, logUpdateAudit, captureSnapshot } from '../services/audit.service';

export const getPicklists = async (req: AuthRequest, res: Response) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const where: any = { warehouse: { tenantId: req.user!.tenant_id } };
  if (warehouseId) where.warehouseId = warehouseId;
  const picklists = await prisma.picklist.findMany({
    where,
    include: { warehouse: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(picklists);
};

export const createPicklist = async (req: AuthRequest, res: Response) => {
  const { warehouseId } = req.body;
  const picklist = await prisma.picklist.create({
    data: { warehouseId, status: 'PENDING' },
  });
  res.status(201).json(picklist);
  logAudit({ tenantId: req.user!.tenant_id, userId: req.user!.id, action: 'CREATE', entityType: 'Picklist', entityId: picklist.id, newValue: { warehouseId } });
};

export const assignPicker = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { pickerId } = req.body;
  const before = await captureSnapshot('Picklist', id);
  const now = new Date();
  const picklist = await prisma.picklist.update({
    where: { id },
    data: {
      pickerId,
      assignedAt: now,
      startedAt: now,
      status: 'PICKING',
    },
  });
  res.json(picklist);
  if (before) {
    await logUpdateAudit({
      tenantId: req.user!.tenant_id,
      userId: req.user!.id,
      action: 'ASSIGN_PICKER',
      entityType: 'Picklist',
      entityId: id,
      before,
      after: { ...before, ...picklist } as any,
    });
  }
};
