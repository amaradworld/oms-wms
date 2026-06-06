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
  await seedDefaultSequences(warehouse.id, req.user!.tenant_id);
  res.status(201).json(warehouse);
};

export const updateWarehouse = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;
  const existing = await prisma.warehouse.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ message: 'Warehouse not found' });
  const data = pick(req.body);
  if (Object.keys(data).length === 0) return res.status(400).json({ message: 'No fields to update' });

  await prisma.warehouse.updateMany({
    where: { id, tenantId },
    data,
  });

  await recordFacilityChanges(existing, data, req);
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
  await seedDefaultSequences(facility.id, req.user!.tenant_id);
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

const DEFAULT_SEQUENCES: Array<{ name: string; prefix: string; description: string }> = [
  { name: 'DELIVERY_CHALLAN',       prefix: 'DC',   description: 'Used for creating Delivery Challans. Delivery Challans are created in cases of interstate RETURNABLE gate passes' },
  { name: 'GATEPASS_INVOICE',       prefix: 'GPI',  description: 'When Gatepass Type - NON_RETURNABLE, the GATEPASS_INVOICE sequence is used for invoice generation' },
  { name: 'GATEPASS_RETURN_INVOICE',prefix: 'GPRI', description: 'Used for Gatepass Return Invoice creation' },
  { name: 'INVOICE',                prefix: '',     description: 'Used in Sale Invoice creation when Tenant is not GST Enabled' },
  { name: 'OUTBOUND_GATE_PASS',     prefix: 'GP',   description: 'When Gatepass Types - RETURNABLE and STOCK_TRANSFER, then OUTBOUND_GATE_PASS sequence is used for printing gatepass' },
  { name: 'PURCHASE_INVOICE',       prefix: 'INP',  description: 'Used in Purchase Invoice' },
  { name: 'PURCHASE_ORDER',         prefix: 'PO',   description: 'Used in Purchase Order creation' },
  { name: 'PURCHASE_RETURN_INVOICE',prefix: 'IPR',  description: 'When Gatepass Type - RETURN_TO_VENDOR, the PURCHASE_RETURN_INVOICE sequence for is used for invoice generation' },
  { name: 'RETURN_MANIFEST',        prefix: 'RM',   description: 'Used in Return Manifest creation' },
  { name: 'REVERSE_PICKUP',         prefix: 'RP',   description: 'Used in Reverse Pickup Order creation' },
  { name: 'SALE_INVOICE',           prefix: 'INS',  description: 'Used in Sale Invoice creation when Tenant is GST Enabled' },
  { name: 'SALE_RETURN_INVOICE',    prefix: 'ISR',  description: 'Used in Sale Order Return Invoice creation' },
  { name: 'SHIPPING_MANIFEST',      prefix: 'SM',   description: 'Used in Shipping Manifest creation' },
  { name: 'SHIPPING_PACKAGE',       prefix: 'SP',   description: 'Used in Shipping Package for a Sale Order' },
];

export const seedDefaultSequences = async (warehouseId: string, tenantId: string) => {
  const existing = await prisma.facilitySequence.findMany({ where: { warehouseId } });
  const existingNames = new Set(existing.map(s => s.sequenceName));
  for (const seq of DEFAULT_SEQUENCES) {
    if (!existingNames.has(seq.name)) {
      await prisma.facilitySequence.create({
        data: {
          warehouseId,
          tenantId,
          sequenceName: seq.name,
          prefix: seq.prefix,
          description: seq.description,
          currentValue: 1,
        },
      });
    }
  }
};

export const getFacilitySequences = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
  });
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  const existing = await prisma.facilitySequence.findMany({ where: { warehouseId: id } });
  if (existing.length === 0) {
    await seedDefaultSequences(id, req.user!.tenant_id);
  }
  const sequences = await prisma.facilitySequence.findMany({
    where: { warehouseId: id },
    orderBy: { sequenceName: 'asc' },
  });
  res.json(sequences);
};

export const updateFacilitySequence = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const seqId = req.params.seqId as string;
  const tenantId = req.user!.tenant_id;
  const warehouse = await prisma.warehouse.findFirst({ where: { id, tenantId } });
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });

  const existing = await prisma.facilitySequence.findFirst({
    where: { id: seqId, warehouseId: id },
  });
  if (!existing) return res.status(404).json({ message: 'Sequence not found' });

  const { sequenceName, description, prefix, currentValue, nextYearPrefix, resetCounterNextYear } = req.body;
  const updates: any = {};
  if (sequenceName !== undefined) updates.sequenceName = sequenceName;
  if (description !== undefined) updates.description = description;
  if (prefix !== undefined) updates.prefix = prefix;
  if (currentValue !== undefined) updates.currentValue = Number(currentValue);
  if (nextYearPrefix !== undefined) updates.nextYearPrefix = nextYearPrefix;
  if (resetCounterNextYear !== undefined) updates.resetCounterNextYear = Boolean(resetCounterNextYear);

  await prisma.facilitySequence.update({ where: { id: seqId }, data: updates });

  const changes: string[] = [];
  if (existing.currentValue !== updates.currentValue) {
    changes.push(`CurrentValue from- ${existing.currentValue}, to- ${updates.currentValue}`);
  }
  if ((existing.description ?? null) !== (updates.description ?? existing.description ?? null)) {
    changes.push(`NewDescription from- ${existing.description ?? 'null'}, to- ${updates.description ?? 'null'}`);
  }
  if (changes.length > 0) {
    await prisma.facilityActivityLog.create({
      data: {
        tenantId,
        warehouseId: id,
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'SEQUENCE_CHANGE',
        field: existing.sequenceName,
        description: `Sequence: ${existing.sequenceName}, ${changes.join(', ')}`,
      },
    });
  }

  res.json({ success: true });
};

export const getFacilityActivity = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
  });
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  const logs = await prisma.facilityActivityLog.findMany({
    where: { warehouseId: id },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
  res.json(logs);
};

const TRACKED_FIELDS: Record<string, string> = {
  name: 'Name',
  code: 'Code',
  displayName: 'Display Name',
  partyName: 'Party Name',
  type: 'Type',
  websiteUrl: 'Website URL',
  alternateCode: 'Alternate Code',
  posEnabled: 'POS Enabled',
  processingCapacity: 'Processing Capacity',
  allowMaxLimit: 'Allow Maximum Limit',
  operationalType: 'Operational Type',
  associatedPosChannel: 'Associated POS Channel',
  itemSealEnabled: 'Item Seal Enabled',
  priority: 'Priority',
  contactPerson: 'Contact Person',
  contactEmail: 'Contact Email',
  contactPhone: 'Contact Phone',
  openingTime: 'Opening Time',
  closingTime: 'Closing Time',
  b2cTaxAddressType: 'B2C Address Type',
  channelImageProcessing: 'Channel Product Image Assisted Processing',
  autoPackageDimensions: 'Auto Populate Shipping Package Dimensions',
  gstin: 'GSTIN',
  pan: 'PAN',
  tin: 'TIN',
  cst: 'Central Sale Tax',
  serviceTax: 'Service Tax',
  upiAddress: 'UPI Address',
  bankName: 'Bank Name',
  accountNumber: 'Account Number',
  ifscCode: 'IFSC Code',
  billingAddress1: 'Billing Address Line 1',
  billingAddress2: 'Billing Address Line 2',
  billingCity: 'Billing City',
  billingPinCode: 'Billing Pin Code',
  billingState: 'Billing State',
  billingCountry: 'Billing Country',
  billingPhone: 'Billing Phone',
  shippingAddress1: 'Shipping Address Line 1',
  shippingAddress2: 'Shipping Address Line 2',
  shippingCity: 'Shipping City',
  shippingPinCode: 'Shipping Pin Code',
  shippingState: 'Shipping State',
  shippingCountry: 'Shipping Country',
  shippingPhone: 'Shipping Phone',
  shippingSameAsBilling: 'Same as Billing',
  isActive: 'Active',
};

const formatVal = (v: any): string => {
  if (v === null || v === undefined || v === '') return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
};

const recordFacilityChanges = async (existing: any, data: any, req: AuthRequest) => {
  const tenantId = req.user!.tenant_id;
  const warehouseId = existing.id;
  const userId = req.user!.id;
  const email = req.user!.email;
  for (const [key, newVal] of Object.entries(data)) {
    const label = TRACKED_FIELDS[key];
    if (!label) continue;
    const oldVal = (existing as any)[key];
    if (formatVal(oldVal) === formatVal(newVal)) continue;
    await prisma.facilityActivityLog.create({
      data: {
        tenantId,
        warehouseId,
        userId,
        userEmail: email,
        action: 'FIELD_CHANGE',
        field: label,
        oldValue: formatVal(oldVal),
        newValue: formatVal(newVal),
        description: `${label} config changed from ${formatVal(oldVal)} to ${formatVal(newVal)}`,
      },
    });
  }
};
