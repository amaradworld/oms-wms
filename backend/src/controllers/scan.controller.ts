import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { resolveSku } from '../utils/sku-resolver';

export const verifyScan = async (req: AuthRequest, res: Response) => {
  const { code: scanValue, type } = req.body;
  const { tenant_id } = req.user!;
  const scanType = type || (scanValue?.startsWith?.('BIN-') ? 'BIN' : 'SKU');

  try {
    if (scanType === 'SKU') {
      const sku = await resolveSku(tenant_id, scanValue);
      if (!sku) return res.status(404).json({ message: 'Invalid SKU or EPC' });
      return res.json({ status: 'SUCCESS', data: sku });
    }

    if (scanType === 'BIN') {
      const bins = await prisma.inventory.findMany({
        where: { binLocation: scanValue, warehouse: { tenantId: tenant_id } },
        include: { sku: { select: { skuCode: true, name: true } }, warehouse: { select: { name: true } } },
      });
      if (bins.length === 0) return res.status(404).json({ message: 'Bin not found' });
      return res.json({ status: 'SUCCESS', data: bins });
    }

    res.status(400).json({ message: 'Invalid scan type' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during scan' });
  }
};
