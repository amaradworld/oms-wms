import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getWarehouses = async (req: AuthRequest, res: Response) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: req.user!.tenant_id, parentId: null },
    include: { children: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(warehouses);
};

export const getWarehouseById = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
    include: { children: true, inventory: { include: { sku: true } } },
  });
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  res.json(warehouse);
};

export const createWarehouse = async (req: AuthRequest, res: Response) => {
  const { name, location, address } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const warehouse = await prisma.warehouse.create({
    data: { name, location, address, tenantId: req.user!.tenant_id },
  });
  res.status(201).json(warehouse);
};

export const updateWarehouse = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, location, address, isActive } = req.body;
  await prisma.warehouse.updateMany({
    where: { id, tenantId: req.user!.tenant_id },
    data: { name, location, address, isActive },
  });
  res.json({ success: true });
};

export const getFacilities = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const facilities = await prisma.warehouse.findMany({
    where: { parentId: id, tenantId: req.user!.tenant_id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(facilities);
};

export const createFacility = async (req: AuthRequest, res: Response) => {
  const parentId = req.params.id as string;
  const { name, location, address } = req.body;
  const parent = await prisma.warehouse.findFirst({
    where: { id: parentId, tenantId: req.user!.tenant_id },
  });
  if (!parent) return res.status(404).json({ message: 'Parent warehouse not found' });
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const facility = await prisma.warehouse.create({
    data: { name, location, address, parentId, tenantId: req.user!.tenant_id },
  });
  res.status(201).json(facility);
};

export const getMasterView = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId },
    include: {
      children: true,
      inventory: { include: { sku: true } },
    },
  });
  const allFacilityIds = warehouses.flatMap(w => [w.id, ...w.children.map(c => c.id)]);
  const orders = await prisma.order.findMany({
    where: { warehouseId: { in: allFacilityIds } },
    include: { items: { include: { sku: true } }, warehouse: { select: { name: true } } },
  });
  res.json({ warehouses, orders });
};
