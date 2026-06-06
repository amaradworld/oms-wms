import { Response } from 'express';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateBarcode, numberToWords, formatINR, formatDateIN, formatDateTimeIN } from '../utils/pdf-utils';

export const setEwayBill = async (req: AuthRequest, res: Response) => {
  const id = req.params.orderId as string;
  const { ewayBillNumber, irn } = req.body;

  const order = await prisma.order.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(ewayBillNumber ? { ewayBillNumber } : {}),
      ...(irn ? { irn } : {}),
    },
  });

  res.json({ message: 'E-way bill updated', ewayBillNumber: updated.ewayBillNumber, irn: updated.irn });
};

function drawBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
}

function drawCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'right' | 'center' } = {}) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7);
  doc.text(text || '', x + 2, y + 2, { width: w - 4, height: h - 4, align: opts.align || 'left', ellipsis: true });
}

export const generateInvoice = async (req: AuthRequest, res: Response) => {
  const orderId = req.params.orderId as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { sku: { select: { skuCode: true, name: true, brand: true, hsnCode: true, weight: true } } } },
        warehouse: { select: { name: true, code: true, address: true, gstin: true, pan: true, contactPhone: true } },
        tracking: { select: { awbNumber: true, courierName: true } },
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const invoiceNo = `INS${String(order.orderNumber).replace(/\D/g, '').slice(-5) || Date.now().toString().slice(-5)}`;
    const orderNo = String(order.orderNumber);
    const channelName = (order as any).channelName || order.source || 'CUSTOM';
    const paymentMode = (order.paymentMode || 'PREPAID').toUpperCase();
    const sellerGstin = order.warehouse?.gstin || '07AAHCI3479D1ZI';
    const sellerName = order.warehouse?.code || order.warehouse?.name?.toUpperCase().replace(/\s+/g, ' ') + ' WH' || 'WAREHOUSE';
    const sellerAddress = order.warehouse?.address || '-';
    const awbNumber = order.tracking?.awbNumber || '';
    const courier = order.tracking?.courierName || 'SELF';

    // Pre-generate barcodes
    const orderBarcode = await generateBarcode(orderNo, { scale: 2, height: 10 });
    const awbBarcode = awbNumber ? await generateBarcode(awbNumber, { scale: 2, height: 10 }) : null;

    const doc = new PDFDocument({ margin: 20, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderNo}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const margin = 20;
    const contentW = pageW - margin * 2;

    // === Top "Tax Invoice" centered title ===
    doc.font('Helvetica-Bold').fontSize(12).text('Tax Invoice', 0, margin, { width: pageW, align: 'center' });
    doc.y = margin + 18;

    // === Row 1: Seller | Invoice details | Date/Portal/Payment ===
    const row1Y = doc.y;
    const col1W = 200, col2W = contentW - 200 - 170, col3W = 170;

    // Col 1: Seller
    drawBox(doc, margin, row1Y, col1W, 90);
    doc.font('Helvetica-Bold').fontSize(9).text(sellerName, margin + 4, row1Y + 4, { width: col1W - 8 });
    doc.font('Helvetica').fontSize(7);
    let sellerY = row1Y + 16;
    if (sellerAddress) {
      const addrLines = doc.heightOfString(sellerAddress, { width: col1W - 8 });
      doc.text(sellerAddress, margin + 4, sellerY, { width: col1W - 8 });
      sellerY += addrLines + 2;
    }
    doc.text(`GSTIN: ${sellerGstin}`, margin + 4, sellerY, { width: col1W - 8 });

    // Col 2: Invoice No + Order No + Barcode
    drawBox(doc, margin + col1W, row1Y, col2W, 90);
    doc.font('Helvetica').fontSize(7).text('Invoice No:', margin + col1W + 4, row1Y + 4);
    doc.font('Helvetica-Bold').fontSize(9).text(invoiceNo, margin + col1W + 4, row1Y + 14);
    doc.font('Helvetica').fontSize(7).text(`Order No: ${orderNo}`, margin + col1W + 4, row1Y + 28);
    doc.image(orderBarcode, margin + col1W + 4, row1Y + 38, { width: col2W - 8, height: 30 });
    doc.font('Helvetica').fontSize(6).text(orderNo, margin + col1W + 4, row1Y + 70, { width: col2W - 8, align: 'center' });

    // Col 3: Date / Portal / Payment
    const c3x = margin + col1W + col2W;
    drawBox(doc, c3x, row1Y, col3W, 90);
    doc.font('Helvetica').fontSize(7).text('Invoice Date', c3x + 4, row1Y + 4);
    doc.font('Helvetica-Bold').fontSize(9).text(formatDateIN(order.createdAt), c3x + 4, row1Y + 14);
    doc.font('Helvetica').fontSize(7).text('Portal:', c3x + 4, row1Y + 30);
    doc.font('Helvetica-Bold').fontSize(8).text(channelName, c3x + 4, row1Y + 38);
    doc.font('Helvetica').fontSize(7).text('Payment Mode', c3x + 4, row1Y + 52);
    doc.font('Helvetica-Bold').fontSize(9).text(paymentMode, c3x + 4, row1Y + 62);
    doc.font('Helvetica').fontSize(7).text('Order Date:', c3x + 4, row1Y + 78);
    doc.text(formatDateIN(order.createdAt), c3x + 50, row1Y + 78);

    // === Row 2: Bill To | Ship To | Dispatch Through ===
    const row2Y = row1Y + 90;
    const billW = 200;
    const dispatchW = 170;
    const shipW = contentW - billW - dispatchW;

    drawBox(doc, margin, row2Y, billW, 80);
    doc.font('Helvetica-Bold').fontSize(8).text('Bill To:', margin + 4, row2Y + 4, { width: billW - 8 });
    doc.font('Helvetica-Bold').fontSize(9).text(order.billingName || order.customerName, margin + 4, row2Y + 16, { width: billW - 8 });
    doc.font('Helvetica').fontSize(7);
    const billAddr = [order.billingAddress1, order.billingAddress2, order.billingCity, order.billingState, order.billingPinCode, order.billingCountry || 'India'].filter(Boolean).join(', ');
    doc.text(billAddr || order.shippingAddress, margin + 4, row2Y + 28, { width: billW - 8 });
    if (order.customerGstin) doc.text(`GSTIN: ${order.customerGstin}`, margin + 4, row2Y + 56, { width: billW - 8 });

    const shipX = margin + billW;
    drawBox(doc, shipX, row2Y, shipW, 80);
    doc.font('Helvetica-Bold').fontSize(8).text('Ship To:', shipX + 4, row2Y + 4, { width: shipW - 8 });
    doc.font('Helvetica-Bold').fontSize(9).text(order.customerName, shipX + 4, row2Y + 16, { width: shipW - 8 });
    doc.font('Helvetica').fontSize(7);
    doc.text(order.shippingAddress, shipX + 4, row2Y + 28, { width: shipW - 8 });

    const dX = shipX + shipW;
    drawBox(doc, dX, row2Y, dispatchW, 80);
    doc.font('Helvetica-Bold').fontSize(8).text('Dispatch Through', dX + 4, row2Y + 4, { width: dispatchW - 8 });
    doc.font('Helvetica-Bold').fontSize(9).text(courier, dX + 4, row2Y + 16, { width: dispatchW - 8 });
    if (awbNumber) {
      doc.font('Helvetica').fontSize(7).text('AWB No', dX + 4, row2Y + 30);
      doc.font('Helvetica-Bold').fontSize(7).text(awbNumber, dX + 4, row2Y + 38, { width: dispatchW - 8 });
      if (awbBarcode) {
        doc.image(awbBarcode, dX + 4, row2Y + 48, { width: dispatchW - 8, height: 22 });
      }
    }

    // === Items table ===
    const tableY = row2Y + 80 + 4;
    const cols = [
      { key: 'sr',     label: 'Sr No.',          w: 28,  align: 'center' as const },
      { key: 'name',   label: 'Product Name',    w: 130, align: 'left' as const },
      { key: 'code',   label: 'Product Code.',   w: 90,  align: 'left' as const },
      { key: 'qty',    label: 'Qty',             w: 22,  align: 'right' as const },
      { key: 'rate',   label: 'Rate',            w: 50,  align: 'right' as const },
      { key: 'taxable',label: 'Taxable Value',   w: 55,  align: 'right' as const },
      { key: 'cgst',   label: 'CGST (INR)',      w: 45,  align: 'right' as const },
      { key: 'sgst',   label: 'SGST (INR)',      w: 45,  align: 'right' as const },
      { key: 'amount', label: 'Amount (INR)',    w: 50,  align: 'right' as const },
    ];
    // Add CGST % and SGST % - we'll split
    const colTotal = cols.reduce((s, c) => s + c.w, 0);
    let cx = margin;
    // Header row
    doc.font('Helvetica-Bold').fontSize(7);
    cols.forEach(c => {
      drawCell(doc, cx, tableY, c.w, 24, c.label, { size: 7, bold: true, align: c.align });
      cx += c.w;
    });
    // Split last 2 into amount + percent: actually we'll keep the format simpler

    let totalQty = 0;
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalAmount = 0;
    let rowY = tableY + 24;

    // GST rate: assume 9% CGST + 9% SGST (18% total) — common in India. If unitPrice already includes GST,
    // split as 50/50.
    const GST_RATE = 0.09;

    order.items.forEach((item, i) => {
      const code = item.sku?.skuCode || item.skuId || '';
      const name = item.sku?.name || '';
      const hsn = item.sku?.hsnCode || '-';
      const qty = item.quantity;
      const lineTotal = Number(item.totalAmount);
      const unitPrice = Number(item.unitPrice);
      // Assume unitPrice/total is INCLUSIVE of GST, so taxable = total / 1.18, CGST/SGST = taxable * 0.09
      const taxable = +(lineTotal / (1 + GST_RATE * 2)).toFixed(2);
      const cgst = +(taxable * GST_RATE).toFixed(2);
      const sgst = +(taxable * GST_RATE).toFixed(2);

      totalQty += qty;
      totalTaxable += taxable;
      totalCGST += cgst;
      totalSGST += sgst;
      totalAmount += lineTotal;

      // Product Code + HSN stacked
      const codeCell = `${code}\nHSN code: ${hsn}`;

      let cellX = margin;
      const cellH = 28;
      drawCell(doc, cellX, rowY, cols[0].w, cellH, String(i + 1), { size: 8, align: 'center' }); cellX += cols[0].w;
      drawCell(doc, cellX, rowY, cols[1].w, cellH, name, { size: 7 }); cellX += cols[1].w;
      drawCell(doc, cellX, rowY, cols[2].w, cellH, codeCell, { size: 7 }); cellX += cols[2].w;
      drawCell(doc, cellX, rowY, cols[3].w, cellH, String(qty), { size: 8, align: 'right' }); cellX += cols[3].w;
      drawCell(doc, cellX, rowY, cols[4].w, cellH, formatINR(unitPrice), { size: 7, align: 'right' }); cellX += cols[4].w;
      drawCell(doc, cellX, rowY, cols[5].w, cellH, formatINR(taxable), { size: 7, align: 'right' }); cellX += cols[5].w;
      // CGST amount + % stacked
      drawCell(doc, cellX, rowY, cols[6].w, cellH, `${formatINR(cgst)}\n(9.000%)`, { size: 6, align: 'right' }); cellX += cols[6].w;
      drawCell(doc, cellX, rowY, cols[7].w, cellH, `${formatINR(sgst)}\n(9.000%)`, { size: 6, align: 'right' }); cellX += cols[7].w;
      drawCell(doc, cellX, rowY, cols[8].w, cellH, formatINR(lineTotal), { size: 7, align: 'right' });

      rowY += cellH;
    });

    // Total row
    let cellX = margin;
    const cellH = 18;
    const totalLabelCell = cols[0].w + cols[1].w + cols[2].w;
    drawCell(doc, cellX, rowY, totalLabelCell, cellH, 'Total', { size: 8, bold: true, align: 'right' }); cellX += totalLabelCell;
    drawCell(doc, cellX, rowY, cols[3].w, cellH, String(totalQty), { size: 8, bold: true, align: 'right' }); cellX += cols[3].w;
    drawCell(doc, cellX, rowY, cols[4].w, cellH, '', { size: 7, align: 'right' }); cellX += cols[4].w;
    drawCell(doc, cellX, rowY, cols[5].w, cellH, formatINR(totalTaxable), { size: 7, bold: true, align: 'right' }); cellX += cols[5].w;
    drawCell(doc, cellX, rowY, cols[6].w, cellH, formatINR(totalCGST), { size: 7, bold: true, align: 'right' }); cellX += cols[6].w;
    drawCell(doc, cellX, rowY, cols[7].w, cellH, formatINR(totalSGST), { size: 7, bold: true, align: 'right' }); cellX += cols[7].w;
    drawCell(doc, cellX, rowY, cols[8].w, cellH, formatINR(totalAmount), { size: 7, bold: true, align: 'right' });

    rowY += cellH + 6;

    // Amount in words
    doc.font('Helvetica-Bold').fontSize(8).text('Amount Chargeable (in words)', margin, rowY);
    rowY += 12;
    doc.font('Helvetica-Bold').fontSize(9).text(`INR ${numberToWords(Math.floor(totalAmount))} Only`, margin, rowY);
    rowY += 14;
    doc.font('Helvetica-Bold').fontSize(8).text(`E. & O.E`, margin + contentW - 60, rowY - 14);
    rowY += 2;
    doc.font('Helvetica-Bold').fontSize(8).text('Tax is payable on reverse charge basis: No', margin, rowY);
    rowY += 10;

    // === Declaration + Signatory ===
    const halfW = contentW / 2;
    const decY = rowY;
    const decH = 60;
    drawBox(doc, margin, decY, halfW, decH);
    doc.font('Helvetica-Bold').fontSize(8).text('Declaration', margin + 4, decY + 4, { width: halfW - 8 });
    doc.font('Helvetica').fontSize(7);
    const decl = [
      '1. This is a computer generated Invoice. Doesnt require signature or stamp.',
      '2. All figures are showing in INR 3.',
      'Ship/Handling Charges inclusive of GST  4. All Disputes are',
      'subject to Delhi (07) Jurisdiction only.',
    ];
    let dy = decY + 14;
    decl.forEach(d => {
      doc.text(d, margin + 4, dy, { width: halfW - 8 });
      dy += 10;
    });

    const sigX = margin + halfW;
    drawBox(doc, sigX, decY, halfW, decH);
    doc.font('Helvetica-Bold').fontSize(8).text(`For ${sellerName}`, sigX + 4, decY + 4, { width: halfW - 8, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(14).text('~ signed ~', sigX + 4, decY + 26, { width: halfW - 8, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(8).text('Authorised Signatory', sigX + 4, decY + decH - 14, { width: halfW - 8, align: 'center' });

    rowY = decY + decH + 4;

    // === Footer ===
    drawBox(doc, margin, rowY, 100, 30);
    doc.font('Helvetica').fontSize(7).text('Bill By:', margin + 4, rowY + 4);
    doc.font('Helvetica-Bold').fontSize(9).text('globalsupply.in', margin + 4, rowY + 14);
    doc.fontSize(6).text('Powered By', margin + 4, rowY + 22);

    doc.font('Helvetica').fontSize(7).text('This is a computer generated Invoice', margin + 110, rowY + 12, { width: contentW - 110, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ message: 'Invoice generation failed', error: String(error) });
  }
};
