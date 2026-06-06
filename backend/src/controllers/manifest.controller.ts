import { Response } from 'express';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateBarcode, formatINR, extractCity, extractPincode, aggregateContents, totalWeightInGm } from '../utils/pdf-utils';

function drawBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
}

function drawCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'right' | 'center' } = {}) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7);
  doc.text(text || '', x + 2, y + 2, { width: w - 4, height: h - 4, align: opts.align || 'left', ellipsis: true });
}

export const getManifests = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { courier, status } = req.query;
  const where: any = { tenantId };
  if (courier) where.courierName = courier as string;
  if (status) where.status = status as string;

  const manifests = await prisma.manifest.findMany({
    where,
    include: {
      _count: { select: { shipments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(manifests);
};

export const getManifestById = async (req: AuthRequest, res: Response) => {
  const manifest = await prisma.manifest.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      shipments: {
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              orderStatus: true,
              shippingAddress: true,
              tracking: { select: { awbNumber: true } },
            },
          },
        },
      },
    },
  });
  if (!manifest) return res.status(404).json({ message: 'Manifest not found' });
  res.json(manifest);
};

export const createManifest = async (req: AuthRequest, res: Response) => {
  const { courierName, orderIds } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!courierName) {
    return res.status(400).json({ message: 'Courier name is required' });
  }
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: 'At least one order is required' });
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, tenantId },
    include: { tracking: true },
  });

  const validOrders = orders.filter(o => o.orderStatus === 'SHIPPED' && o.tracking);
  if (validOrders.length === 0) {
    return res.status(400).json({ message: 'No shipped orders with AWB found for the given IDs' });
  }

  const manifest = await prisma.$transaction(async (tx) => {
    const m = await tx.manifest.create({
      data: {
        tenantId,
        manifestNumber: `MAN-${Date.now()}`,
        courierName,
        totalShipments: validOrders.length,
        shipments: {
          create: validOrders.map(o => ({
            orderId: o.id,
            awbNumber: o.tracking!.awbNumber,
            courierName,
          })),
        },
      },
    });
    return m;
  });

  const created = await prisma.manifest.findUnique({
    where: { id: manifest.id },
    include: { _count: { select: { shipments: true } } },
  });

  res.status(201).json(created);
};

export const closeManifest = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const manifest = await prisma.manifest.findFirst({
    where: { id, tenantId: req.user!.tenant_id },
    include: { shipments: { select: { orderId: true } } },
  });
  if (!manifest) return res.status(404).json({ message: 'Manifest not found' });
  if (manifest.status !== 'OPEN') return res.status(400).json({ message: 'Manifest already closed' });

  await prisma.$transaction([
    prisma.manifest.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    }),
    prisma.order.updateMany({
      where: { id: { in: manifest.shipments.map(s => s.orderId) } },
      data: { orderStatus: 'DISPATCHED' },
    }),
  ]);

  res.json({ message: 'Manifest closed, orders dispatched' });
};

export const getShippedOrdersForManifest = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { courierName } = req.query;

  const where: any = { tenantId, orderStatus: 'SHIPPED', tracking: { isNot: null } };
  if (courierName) {
    where.tracking = { courierName: courierName as string };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      tracking: true,
      items: { include: { sku: { select: { skuCode: true, name: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const couriers = [...new Set(orders.map(o => o.tracking!.courierName).filter(Boolean))];

  res.json({ orders, couriers });
};

export const downloadManifestPdf = async (req: AuthRequest, res: Response) => {
  const m = await prisma.manifest.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      shipments: {
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              shippingAddress: true,
              billingPinCode: true,
              orderAmount: true,
              paymentMode: true,
              displayOrderCode: true,
              source: true,
              items: { include: { sku: { select: { name: true, weight: true } } } },
              tracking: { select: { awbNumber: true, courierName: true } },
            },
          },
        },
      },
    },
  });
  if (!m) return res.status(404).json({ message: 'Manifest not found' });

  try {
    // Pre-generate barcodes for each shipment
    const barcodes: { [awb: string]: Buffer } = {};
    for (const s of m.shipments) {
      if (s.awbNumber && !barcodes[s.awbNumber]) {
        barcodes[s.awbNumber] = await generateBarcode(s.awbNumber, { scale: 2, height: 8 });
      }
    }

    // Landscape A4
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=manifest_${m.manifestNumber}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 20;
    const contentW = pageW - margin * 2;

    // === Top header row: Manifest No | Shipping Provider | Channel Name ===
    const headerY = margin;
    const leftW = 130;
    const centerW = contentW - 200;
    const rightW = contentW - leftW - centerW;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Manifest No: ${m.manifestNumber}`, margin, headerY, { width: leftW });

    doc.fontSize(10);
    doc.text(`Shipping Provider Name: ${m.courierName}`, margin + leftW, headerY, { width: centerW, align: 'center' });
    doc.text('(CHANNEL)', margin + leftW, headerY + 12, { width: centerW, align: 'center' });

    doc.text(`Channel Name: ${m.shipments[0]?.order?.source || 'CUSTOM'}`, margin + leftW + centerW, headerY, { width: rightW, align: 'right' });

    const tableTop = headerY + 26;

    // === Manifest table ===
    const cols = [
      { key: 'awb',        label: 'Airwaybill',     w: 75,  align: 'center' as const },
      { key: 'ref',        label: 'Reference Number', w: 95, align: 'left' as const },
      { key: 'attention',  label: 'Attention',      w: 80,  align: 'left' as const },
      { key: 'address',    label: 'Address3',       w: 80,  align: 'left' as const },
      { key: 'pincode',    label: 'Pincode',        w: 50,  align: 'center' as const },
      { key: 'contents',   label: 'Contents',       w: 130, align: 'left' as const },
      { key: 'weight',     label: 'Weight(gm)',     w: 55,  align: 'right' as const },
      { key: 'declared',   label: 'Declared Value', w: 60,  align: 'right' as const },
      { key: 'collectable',label: 'Collectable',    w: 55,  align: 'right' as const },
      { key: 'mode',       label: 'Mode',           w: 40,  align: 'center' as const },
      { key: 'barcode',    label: 'Barcode',        w: 95,  align: 'center' as const },
    ];

    let cx = margin;
    doc.font('Helvetica-Bold').fontSize(7);
    cols.forEach(c => {
      drawCell(doc, cx, tableTop, c.w, 22, c.label, { size: 7, bold: true, align: c.align });
      cx += c.w;
    });

    let rowY = tableTop + 22;
    const cellH = 36;
    const totalRows = m.shipments.length;
    const totalDeclared = m.shipments.reduce((s, sh) => s + Number(sh.order?.orderAmount || 0), 0);

    for (const s of m.shipments) {
      const o = s.order;
      const awb = s.awbNumber || '';
      const ref = o.displayOrderCode || o.orderNumber;
      const attention = o.customerName || '-';
      const addr3 = extractCity(o.shippingAddress);
      const pin = extractPincode(o.shippingAddress, o.billingPinCode);
      const contents = aggregateContents((o.items || []).map(i => i.sku?.name || ''));
      const weightGm = totalWeightInGm((o.items || []).map(i => ({ weight: i.sku?.weight })));
      const declared = Number(o.orderAmount || 0);
      const isCOD = (o.paymentMode || '').toUpperCase() === 'COD';
      const collectable = isCOD ? declared : 0;
      const mode = isCOD ? 'COD' : 'PREPAID';

      let cellX = margin;
      drawCell(doc, cellX, rowY, cols[0].w, cellH, awb, { size: 7, align: 'center' }); cellX += cols[0].w;
      drawCell(doc, cellX, rowY, cols[1].w, cellH, ref, { size: 7 }); cellX += cols[1].w;
      drawCell(doc, cellX, rowY, cols[2].w, cellH, attention, { size: 7 }); cellX += cols[2].w;
      drawCell(doc, cellX, rowY, cols[3].w, cellH, addr3, { size: 7 }); cellX += cols[3].w;
      drawCell(doc, cellX, rowY, cols[4].w, cellH, pin, { size: 7, align: 'center' }); cellX += cols[4].w;
      drawCell(doc, cellX, rowY, cols[5].w, cellH, contents, { size: 7 }); cellX += cols[5].w;
      drawCell(doc, cellX, rowY, cols[6].w, cellH, weightGm > 0 ? weightGm.toFixed(3) : '0.000', { size: 7, align: 'right' }); cellX += cols[6].w;
      drawCell(doc, cellX, rowY, cols[7].w, cellH, formatINR(declared), { size: 7, align: 'right' }); cellX += cols[7].w;
      drawCell(doc, cellX, rowY, cols[8].w, cellH, formatINR(collectable), { size: 7, align: 'right' }); cellX += cols[8].w;
      drawCell(doc, cellX, rowY, cols[9].w, cellH, mode, { size: 7, align: 'center' }); cellX += cols[9].w;
      // Barcode cell: image + text below
      drawBox(doc, cellX, rowY, cols[10].w, cellH);
      if (barcodes[awb]) {
        doc.image(barcodes[awb], cellX + 4, rowY + 2, { width: cols[10].w - 8, height: 22 });
        doc.font('Helvetica').fontSize(6).text(awb, cellX, rowY + cellH - 10, { width: cols[10].w, align: 'center' });
      }

      rowY += cellH;

      if (rowY + cellH > pageH - margin - 30) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 20 });
        rowY = margin;
        let cx2 = margin;
        doc.font('Helvetica-Bold').fontSize(7);
        cols.forEach(c => {
          drawCell(doc, cx2, rowY, c.w, 22, c.label, { size: 7, bold: true, align: c.align });
          cx2 += c.w;
        });
        rowY += 22;
      }
    }

    // Totals row
    let cellX = margin;
    const totalLabelW = cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w + cols[5].w;
    drawCell(doc, cellX, rowY, totalLabelW, 16, `Total Shipments: ${totalRows}`, { size: 8, bold: true, align: 'right' }); cellX += totalLabelW;
    drawCell(doc, cellX, rowY, cols[6].w, 16, '', { size: 7, align: 'right' }); cellX += cols[6].w;
    drawCell(doc, cellX, rowY, cols[7].w, 16, formatINR(totalDeclared), { size: 7, bold: true, align: 'right' }); cellX += cols[7].w;
    drawCell(doc, cellX, rowY, cols[8].w + cols[9].w + cols[10].w, 16, '', { size: 7, align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Manifest PDF error:', error);
    res.status(500).json({ message: 'PDF generation failed', error: String(error) });
  }
};
