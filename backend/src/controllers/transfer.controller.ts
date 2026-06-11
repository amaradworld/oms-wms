import { Response } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { resolveSku } from '../utils/sku-resolver';
import { emitInventoryChange } from '../services/marketplaceEvents.service';

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');

function tryAddLogo(doc: typeof PDFDocument.prototype) {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, doc.x, doc.y, { width: 80 });
      doc.moveDown(4);
    }
  } catch (err) {
    console.warn('[Transfer] Could not add logo to PDF:', err);
  }
}

export const getTransfers = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const transfers = await prisma.stockTransfer.findMany({
    where: { tenantId },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transfers);
};

export const getTransfer = async (req: AuthRequest, res: Response) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  res.json(transfer);
};

export const createTransfer = async (req: AuthRequest, res: Response) => {
  const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!items || items.length === 0) return res.status(400).json({ message: 'At least one item is required' });

  const skus = await prisma.skuMaster.findMany({
    where: { skuCode: { in: items.map(i => i.skuCode) }, tenantId },
  });
  const skuMap = new Map(skus.map(s => [s.skuCode, s.id]));
  const missing = items.filter(i => !skuMap.has(i.skuCode));
  if (missing.length) return res.status(400).json({ message: `SKU not found: ${missing.map(i => i.skuCode).join(', ')}` });

  const transfer = await prisma.stockTransfer.create({
    data: {
      tenantId, fromWarehouseId, toWarehouseId, notes,
      createdBy: req.user!.id,
      items: { create: items.map(i => ({ skuId: skuMap.get(i.skuCode)!, quantity: i.quantity })) },
    },
    include: { fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } }, items: { include: { sku: { select: { skuCode: true, name: true } } } } },
  });
  res.status(201).json(transfer);
};

export const scanTransferItem = async (req: AuthRequest, res: Response) => {
  const { skuCode, epcCode } = req.body;
  const code = skuCode || epcCode;
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;
  if (!code) return res.status(400).json({ message: 'skuCode or epcCode is required' });

  const transfer = await prisma.stockTransfer.findFirst({ where: { id, tenantId } });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'DRAFT') return res.status(400).json({ message: 'Transfer already completed' });

  if (req.user!.warehouseId !== transfer.toWarehouseId) {
    return res.status(403).json({ message: 'Only receiving facility users can scan items' });
  }

  const sku = await resolveSku(tenantId, code);
  if (!sku) return res.status(404).json({ message: `SKU with code ${code} not found` });

  const item = await prisma.stockTransferItem.findFirst({
    where: { transferId: id, skuId: sku.id },
  });
  if (!item) return res.status(404).json({ message: 'Item not in this transfer' });

  if (item.receivedQty >= item.quantity) return res.status(400).json({ message: `${code} already fully scanned` });

  const updated = await prisma.stockTransferItem.update({
    where: { id: item.id },
    data: { receivedQty: { increment: 1 }, status: item.receivedQty + 1 >= item.quantity ? 'RECEIVED' : 'PARTIAL' },
    include: { sku: { select: { skuCode: true, name: true } } },
  });

  // Also update inventory for receiving warehouse
  await prisma.inventory.upsert({
    where: {
      warehouseId_skuId_binLocation: {
        warehouseId: transfer.toWarehouseId,
        skuId: sku.id,
        binLocation: '',
      },
    },
    update: {
      quantityOnHand: { increment: 1 },
      quantityAvailable: { increment: 1 },
    },
    create: {
      warehouseId: transfer.toWarehouseId,
      skuId: sku.id,
      binLocation: '',
      quantityOnHand: 1,
      quantityAvailable: 1,
      virtualInventory: 0,
      notFound: 0,
      type: 'Good',
      status: 'ACTIVE',
      inventoryAllocation: true,
      inventorySync: true,
      skuMixing: true,
      shelfOnHold: false,
    },
  });

  res.json(updated);

  emitInventoryChange({ tenantId, skuCode: sku.skuCode, quantity: item.receivedQty + 1, warehouseId: transfer.toWarehouseId });
};

export const completeTransfer = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;

  const transfer: any = await prisma.stockTransfer.findFirst({ where: { id, tenantId }, include: { items: { include: { sku: { select: { skuCode: true } } } } } });
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

  if (transfer.status !== 'DRAFT') return res.status(400).json({ message: 'Already completed' });

  if (req.user!.warehouseId !== transfer.toWarehouseId) {
    return res.status(403).json({ message: 'Only receiving facility users can complete transfers' });
  }

  const unscanned = transfer.items.filter(i => i.status !== 'RECEIVED');
  if (unscanned.length) {
    return res.status(400).json({ message: `Scan all items first. Unscanned: ${unscanned.map(i => i.sku?.skuCode).join(', ')}` });
  }

  for (const item of transfer.items) {
    const fromInv = await prisma.inventory.findFirst({ where: { warehouseId: transfer.fromWarehouseId, skuId: item.skuId } });
    if (!fromInv || fromInv.quantityAvailable < item.receivedQty) {
      return res.status(400).json({ message: `Insufficient stock for ${item.sku?.skuCode}` });
    }
    await prisma.inventory.update({ where: { id: fromInv.id }, data: { quantityOnHand: { decrement: item.receivedQty }, quantityAvailable: { decrement: item.receivedQty } } });
    // Destination inventory already incremented by scanTransferItem — no double-post
  }
  await prisma.stockTransfer.update({
    where: { id },
    data: { status: 'COMPLETED', receivedBy: req.user!.id, receivedAt: new Date() },
  });
  res.json({ message: 'Transfer completed' });
};

export const printTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
      include: {
        fromWarehouse: { select: { name: true, address: true } },
        toWarehouse: { select: { name: true, address: true } },
        items: { include: { sku: { select: { skuCode: true, name: true, size: true, color: true } } } },
      },
    });
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=STN_${transfer.id.slice(0, 8)}.pdf`);
    doc.pipe(res);

    tryAddLogo(doc);

    doc.fontSize(18).font('Helvetica-Bold').text('Stock Transfer Note', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666').text(`STN #: ${transfer.id.slice(0, 8).toUpperCase()}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(0.8);

    doc.fontSize(8).fillColor('#888').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(1);

    const leftCol = doc.x;
    const rightCol = doc.x + 260;

    doc.fontSize(10).font('Helvetica-Bold').text('From:', leftCol, doc.y, { continued: false });
    doc.fontSize(9).font('Helvetica').text(transfer.fromWarehouse.name, leftCol, doc.y + 2);
    doc.fontSize(8).fillColor('#555').text(transfer.fromWarehouse.address || '', leftCol, doc.y + 2);

    const yAfterFrom = doc.y;
    doc.x = rightCol;
    doc.y = yAfterFrom - 24;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('To:', { continued: false });
    doc.fontSize(9).font('Helvetica').text(transfer.toWarehouse.name, doc.x, doc.y + 2);
    doc.fontSize(8).fillColor('#555').text(transfer.toWarehouse.address || '', doc.x, doc.y + 2);

    doc.x = leftCol;
    doc.y = Math.max(yAfterFrom, doc.y) + 12;
    doc.fillColor('#000');

    doc.moveDown(1);

    const statusColor = transfer.status === 'COMPLETED' ? '#16a34a' : transfer.status === 'DRAFT' ? '#2563eb' : '#d97706';
    doc.fontSize(9).font('Helvetica-Bold').fillColor(statusColor).text(`Status: ${transfer.status}`);
    doc.fillColor('#000');

    if (transfer.notes) {
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#555').text(`Notes: ${transfer.notes}`);
      doc.fillColor('#000');
    }

    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [90, 140, 50, 60, 60];
    const colKeys = ['SKU Code', 'Product Name', 'Size', 'Qty Requested', 'Qty Received'];
    let xStart = leftCol;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.rect(leftCol - 4, tableTop - 6, colWidths.reduce((a, b) => a + b, 0) + 8, 20).fill('#1e293b');
    doc.fillColor('#fff');
    colKeys.forEach((h, i) => {
      doc.text(h, xStart + 2, tableTop, { width: colWidths[i] - 4, align: i < 2 ? 'left' : 'center' });
      xStart += colWidths[i];
    });
    doc.fillColor('#000');

    let rowY = tableTop + 18;
    transfer.items.forEach((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(leftCol - 4, rowY - 4, colWidths.reduce((a, b) => a + b, 0) + 8, 18).fill(bgColor);
      xStart = leftCol;
      const row = [item.sku.skuCode, item.sku.name || '—', item.sku.size || '—', String(item.quantity), String(item.receivedQty || 0)];
      doc.fontSize(8).font('Helvetica');
      row.forEach((val, i) => {
        doc.fillColor('#000').text(val, xStart + 2, rowY, { width: colWidths[i] - 4, align: i < 2 ? 'left' : 'center' });
        xStart += colWidths[i];
      });
      rowY += 18;
    });

    const lineY = rowY + 4;
    doc.moveTo(leftCol, lineY).lineTo(leftCol + colWidths.reduce((a, b) => a + b, 0), lineY).stroke('#e2e8f0');

    doc.y = lineY + 30;

    doc.fontSize(8).font('Helvetica');
    doc.text('Received By: __________________', leftCol, doc.y);
    doc.text('Sender\'s Signature: __________________', rightCol - 30, doc.y - 14);
    doc.moveDown(2);
    doc.fontSize(7).fillColor('#999').text('globalsupply.in | This is a computer-generated document', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'PDF generation failed', });
  }
};
