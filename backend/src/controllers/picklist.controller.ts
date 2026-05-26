import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getPicklists = async (req: AuthRequest, res: Response) => {
  const picklists = await prisma.picklist.findMany({
    where: { warehouse: { tenantId: req.user!.tenant_id } },
    include: { warehouse: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(picklists);
};

export const createPicklist = async (req: AuthRequest, res: Response) => {
  const { warehouseId, items } = req.body;
  if (!warehouseId || !items?.length) {
    return res.status(400).json({ message: 'Warehouse and items are required' });
  }
  const picklist = await prisma.picklist.create({
    data: {
      warehouseId,
      status: 'PENDING',
    },
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
