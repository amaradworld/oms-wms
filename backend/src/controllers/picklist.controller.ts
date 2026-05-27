import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

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
};

export const assignPicker = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { pickerId } = req.body;
  const picklist = await prisma.picklist.update({
    where: { id },
    data: { pickerId, status: 'PICKING' },
  });
  res.json(picklist);
};
