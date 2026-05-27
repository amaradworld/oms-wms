import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSkus = async (req: AuthRequest, res: Response) => {
  const skus = await prisma.skuMaster.findMany({
    where: { tenantId: req.user!.tenant_id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(skus);
};

export const createSku = async (req: AuthRequest, res: Response) => {
  const { skuCode, name, styleName, size, color, brand, category, material, gender, unitType, mrp, description, hsnCode, weight, dimensions } = req.body;
  try {
    const existing = await prisma.skuMaster.findUnique({ where: { skuCode } });
    if (existing) return res.status(400).json({ message: 'SKU code already exists' });

    const sku = await prisma.skuMaster.create({
      data: {
        skuCode, name, styleName, size, color, brand, category, material, gender, unitType,
        mrp: mrp ? parseFloat(mrp) : null,
        description, hsnCode,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        tenantId: req.user!.tenant_id,
      },
    });
    res.status(201).json(sku);
  } catch (error) {
    res.status(400).json({ message: 'Error creating SKU', error: String(error) });
  }
};
