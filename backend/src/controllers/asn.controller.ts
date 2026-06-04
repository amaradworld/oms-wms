import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAsns = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const status = req.query.status as string;
  const where: any = { tenantId: tenant_id };
  if (status) where.status = status;

  const asns = await prisma.asn.findMany({
    where,
    include: { items: { include: { sku: true } }, grns: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(asns);
};

export const getAsnDetail = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const asn = await prisma.asn.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
    include: { items: { include: { sku: true } }, grns: true },
  });
  if (!asn) return res.status(404).json({ message: 'ASN not found' });
  res.json(asn);
};

export const createAsn = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const { asnNumber, supplierId, supplierName, expectedDate, notes, warehouseId, items } = req.body;
  if (!asnNumber || !items?.length) return res.status(400).json({ message: 'ASN number and items are required' });

  const existing = await prisma.asn.findUnique({ where: { asnNumber } });
  if (existing) return res.status(409).json({ message: 'ASN number already exists' });

  const asn = await prisma.asn.create({
    data: {
      tenantId: tenant_id, warehouseId, asnNumber, supplierId, supplierName,
      expectedDate: expectedDate ? new Date(expectedDate) : null, notes,
      items: { create: items.map((i: any) => ({ skuId: i.skuId, expectedQty: i.expectedQty, batchNo: i.batchNo, expiryDate: i.expiryDate ? new Date(i.expiryDate) : null })) },
    },
    include: { items: { include: { sku: true } } },
  });
  res.status(201).json(asn);
};

export const updateAsnStatus = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const asn = await prisma.asn.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!asn) return res.status(404).json({ message: 'ASN not found' });

  const updated = await prisma.asn.update({
    where: { id },
    data: { status },
    include: { items: { include: { sku: true } }, grns: true },
  });
  res.json(updated);
};
