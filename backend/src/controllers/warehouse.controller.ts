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

const facilityFields = [
  'name','location','address','isActive','code','type','displayName','partyName',
  'websiteUrl','alternateCode','logoUrl','signatureUrl','posEnabled','processingCapacity',
  'allowMaxLimit','operationalType','associatedPosChannel','itemSealEnabled','priority',
  'contactPerson','contactEmail','contactPhone','openingTime','closingTime','b2cTaxAddressType',
  'channelImageProcessing','autoPackageDimensions','pan','tin','cst','serviceTax','gstin',
  'upiAddress','bankName','accountNumber','ifscCode',
  'billingAddress1','billingAddress2','billingCity','billingPinCode','billingCountry',
  'billingState','billingPhone','billingLatitude','billingLongitude',
  'shippingSameAsBilling','shippingAddress1','shippingAddress2','shippingCity','shippingPinCode',
  'shippingCountry','shippingState','shippingPhone','shippingLatitude','shippingLongitude',
];

const pick = (body: any) => {
  const data: any = {};
  for (const f of facilityFields) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  return data;
};

export const createWarehouse = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const warehouse = await prisma.warehouse.create({
    data: { name, tenantId: req.user!.tenant_id, ...pick(req.body) },
  });
  res.status(201).json(warehouse);
};

export const updateWarehouse = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const data = pick(req.body);
  if (Object.keys(data).length === 0) return res.status(400).json({ message: 'No fields to update' });
  await prisma.warehouse.updateMany({
    where: { id, tenantId: req.user!.tenant_id },
    data,
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
  const { name } = req.body;
  const parent = await prisma.warehouse.findFirst({
    where: { id: parentId, tenantId: req.user!.tenant_id },
  });
  if (!parent) return res.status(404).json({ message: 'Parent warehouse not found' });
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const facility = await prisma.warehouse.create({
    data: { name, parentId, tenantId: req.user!.tenant_id, ...pick(req.body) },
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
