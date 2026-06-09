import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { parse } from 'csv-parse/sync';

export const getCodSettlements = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { status, marketplace, dateFrom, dateTo } = req.query;
  const where: any = { tenantId };
  if (status) where.reconciliationStatus = status as string;
  if (marketplace) where.marketplace = marketplace as string;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const settlements = await prisma.codSettlement.findMany({
    where,
    include: { order: { select: { orderNumber: true, customerName: true, orderAmount: true, paymentMode: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Summary stats
  const totalCod = settlements.reduce((s, c) => s + Number(c.codAmount), 0);
  const totalSettled = settlements.filter(c => c.settledAmount).reduce((s, c) => s + Number(c.settledAmount!), 0);
  const totalDiscrepancy = settlements.filter(c => c.reconciliationStatus === 'DISCREPANCY').length;

  res.json({
    settlements,
    summary: {
      total: settlements.length,
      totalCodAmount: totalCod,
      totalSettledAmount: totalSettled,
      discrepancyCount: totalDiscrepancy,
      pendingCount: settlements.filter(c => c.reconciliationStatus === 'PENDING').length,
      matchedCount: settlements.filter(c => c.reconciliationStatus === 'MATCHED').length,
      settledCount: settlements.filter(c => c.reconciliationStatus === 'SETTLED').length,
    },
  });
};

export const importCodSettlement = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { csvContent, marketplace } = req.body;

  if (!csvContent) return res.status(400).json({ message: 'csvContent is required' });

  try {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

    let imported = 0;
    let matched = 0;
    let discrepancy = 0;

    for (const record of records) {
      const awbNumber = record.awb_number || record.awb || record.AWB || '';
      const codAmount = parseFloat(record.cod_amount || record.cod || record.COD || '0');
      const settledAmount = parseFloat(record.settled_amount || record.settled || record.SETTLED || '0');
      const orderNumber = record.order_id || record.order_number || record.ORDER || '';

      // Find order by AWB or order number
      let orderId: string | null = null;
      if (awbNumber) {
        const tracking = await prisma.courierTracking.findFirst({ where: { awbNumber } });
        if (tracking) orderId = tracking.orderId;
      }
      if (!orderId && orderNumber) {
        const order = await prisma.order.findFirst({ where: { orderNumber, tenantId } });
        if (order) orderId = order.id;
      }

      if (!orderId) continue;

      // Check if settlement already exists
      const existing = await prisma.codSettlement.findFirst({ where: { orderId, awbNumber } });
      if (existing) continue;

      const discrepancyAmount = Math.abs(codAmount - settledAmount);
      const hasDiscrepancy = discrepancyAmount > 1; // ₹1 tolerance

      await prisma.codSettlement.create({
        data: {
          tenantId,
          orderId,
          marketplace: marketplace || record.marketplace || null,
          awbNumber,
          codAmount,
          settledAmount: settledAmount || null,
          reconciliationStatus: hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED',
          discrepancyReason: hasDiscrepancy ? `Amount mismatch: COD ₹${codAmount} vs Settled ₹${settledAmount}` : null,
        },
      });

      imported++;
      if (hasDiscrepancy) discrepancy++;
      else matched++;
    }

    res.json({ message: `Imported ${imported} settlements`, imported, matched, discrepancy });
  } catch (err: any) {
    res.status(400).json({ message: 'CSV parse error', detail: err.message });
  }
};

export const reconcileCodSettlement = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { settledAmount, sellerAdjustment, tds, notes } = req.body;
  const tenantId = req.user!.tenant_id;

  const settlement = await prisma.codSettlement.findFirst({
    where: { id, tenantId },
  });
  if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

  const finalSettled = parseFloat(settledAmount) + (parseFloat(sellerAdjustment) || 0) - (parseFloat(tds) || 0);
  const discrepancy = Math.abs(Number(settlement.codAmount) - finalSettled);

  const updated = await prisma.codSettlement.update({
    where: { id },
    data: {
      settledAmount: finalSettled,
      sellerAdjustment: parseFloat(sellerAdjustment) || 0,
      tds: parseFloat(tds) || 0,
      reconciliationStatus: discrepancy > 1 ? 'DISCREPANCY' : 'SETTLED',
      discrepancyReason: discrepancy > 1 ? `Mismatch: ₹${settlement.codAmount} vs ₹${finalSettled}` : null,
    },
  });

  res.json(updated);
};

export const getCodSummary = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const settlements = await prisma.codSettlement.findMany({
    where: { tenantId, createdAt: { gte: since } },
    select: { codAmount: true, settledAmount: true, reconciliationStatus: true, marketplace: true, createdAt: true },
  });

  const byMarketplace: Record<string, { count: number; codTotal: number; settledTotal: number; discrepancy: number }> = {};
  for (const s of settlements) {
    const mp = s.marketplace || 'UNKNOWN';
    if (!byMarketplace[mp]) byMarketplace[mp] = { count: 0, codTotal: 0, settledTotal: 0, discrepancy: 0 };
    byMarketplace[mp].count++;
    byMarketplace[mp].codTotal += Number(s.codAmount);
    byMarketplace[mp].settledTotal += Number(s.settledAmount || 0);
    if (s.reconciliationStatus === 'DISCREPANCY') byMarketplace[mp].discrepancy++;
  }

  res.json({
    window: { days, from: since.toISOString(), to: new Date().toISOString() },
    total: settlements.length,
    totalCod: settlements.reduce((s, c) => s + Number(c.codAmount), 0),
    totalSettled: settlements.filter(c => c.settledAmount).reduce((s, c) => s + Number(c.settledAmount!), 0),
    discrepancyCount: settlements.filter(c => c.reconciliationStatus === 'DISCREPANCY').length,
    byMarketplace,
  });
};
