import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const verifyScan = async (req: AuthRequest, res: Response) => {
  const { scanValue, type } = req.body; // type: 'SKU' or 'BIN'
  const { tenant_id } = req.user!;

  try {
    if (type === 'SKU') {
      const sku = await prisma.skuMaster.findFirst({
        where: { skuCode: scanValue, tenantId: tenant_id }
      });
      if (!sku) return res.status(404).json({ message: 'Invalid SKU' });
      return res.json({ status: 'SUCCESS', data: sku });
    }

    if (type === 'BIN') {
      const bins = await prisma.inventory.findMany({
        where: { binLocation: scanValue }
      });
      if (bins.length === 0) return res.status(404).json({ message: 'Bin not found' });
      return res.json({ status: 'SUCCESS', data: bins });
    }

    res.status(400).json({ message: 'Invalid scan type' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during scan' });
  }
};
