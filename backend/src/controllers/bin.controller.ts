import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getBins = async (req: AuthRequest, res: Response) => {
  const where: any = { tenantId: req.user!.tenant_id };
  if (req.query.warehouseId) where.warehouseId = req.query.warehouseId as string;

  const bins = await prisma.binLocation.findMany({
    where,
    orderBy: { code: 'asc' },
  });
  res.json(bins);
};

export const createBin = async (req: AuthRequest, res: Response) => {
  const { warehouseId, code, zone, aisle, rack, shelf } = req.body;
  const tenantId = req.user!.tenant_id;

  const existing = await prisma.binLocation.findUnique({
    where: { warehouseId_code: { warehouseId, code } },
  });
  if (existing) return res.status(400).json({ message: `Bin "${code}" already exists in this warehouse` });

  const bin = await prisma.binLocation.create({
    data: { tenantId, warehouseId, code, zone, aisle, rack, shelf },
  });
  res.status(201).json(bin);
};

export const createBulkBins = async (req: AuthRequest, res: Response) => {
  const { warehouseId, codes } = req.body; // codes: string[]
  const tenantId = req.user!.tenant_id;

  const existing = await prisma.binLocation.findMany({
    where: { warehouseId, code: { in: codes }, tenantId },
    select: { code: true },
  });
  const existingSet = new Set(existing.map(b => b.code));
  const newCodes = codes.filter(c => !existingSet.has(c));

  if (newCodes.length === 0) return res.status(400).json({ message: 'All bin codes already exist' });

  await prisma.binLocation.createMany({
    data: newCodes.map(code => ({ tenantId, warehouseId, code })),
  });
  res.status(201).json({ created: newCodes.length, skipped: codes.length - newCodes.length });
};

export const deleteBin = async (req: AuthRequest, res: Response) => {
  const bin = await prisma.binLocation.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
  });
  if (!bin) return res.status(404).json({ message: 'Bin not found' });

  // Check if bin has active putaway tasks
  const activeTasks = await prisma.putawayTask.count({
    where: { binId: bin.id, status: { not: 'COMPLETED' } },
  });
  if (activeTasks > 0) return res.status(400).json({ message: 'Cannot delete bin with active putaway tasks' });

  await prisma.binLocation.delete({ where: { id: bin.id } });
  res.json({ message: 'Bin deleted' });
};
