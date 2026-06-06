import { Response } from 'express';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateBarcode, formatINR, formatDateTimeIN, formatDateIN } from '../utils/pdf-utils';

function drawBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
}

function drawCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'right' | 'center' } = {}) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7);
  doc.text(text || '', x + 2, y + 2, { width: w - 4, height: h - 4, align: opts.align || 'left', ellipsis: true });
}

export const generateSkuLabel = async (req: AuthRequest, res: Response) => {
  const { skuCode, name, binLocation, brand, mrp } = req.body;

  try {
    const doc = new PDFDocument({ size: [300, 200], margin: 15 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label_${skuCode}.pdf`);
    doc.pipe(res);

    doc.fontSize(9).font('Helvetica-Bold').text(skuCode, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(7).font('Helvetica').text(name || '', { align: 'center' });

    if (brand) {
      doc.fontSize(6).fillColor('#666').text(`Brand: ${brand}`, { align: 'center' }).fillColor('#000');
    }
    if (mrp) {
      doc.fontSize(6).text(`MRP: \u20B9${mrp}`, { align: 'center' });
    }

    doc.moveDown(0.3);
    doc.fontSize(6).fillColor('#333').text(`BIN: ${binLocation || 'DEFAULT'}`, { align: 'center' }).fillColor('#000');

    doc.moveDown(0.5);
    doc.fontSize(5).fillColor('#999').text('globalsupply.in', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Label generation failed', error: String(error) });
  }
};

export const generateShippingLabel = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: req.user!.tenant_id },
      include: {
        items: { include: { sku: { select: { skuCode: true, name: true, brand: true, weight: true, dimensions: true } } } },
        warehouse: { select: { name: true, code: true, address: true } },
        tracking: { select: { awbNumber: true, courierName: true } },
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const orderNo = String(order.orderNumber);
    const awbNumber = order.tracking?.awbNumber || '';
    const shipmentId = awbNumber || orderNo;
    const invoiceNo = `INS${orderNo.replace(/\D/g, '').slice(-5) || Date.now().toString().slice(-5)}`;
    const channelName = order.source || 'CUSTOM';
    const paymentMode = (order.paymentMode || 'PREPAID').toUpperCase();
    const courier = order.tracking?.courierName || 'SELF';
    const whCode = order.warehouse?.code || (order.warehouse?.name?.toUpperCase().split(' ').map(w => w[0]).join('') + ' WH') || 'WH';
    const whAddress = order.warehouse?.address || '-';

    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    const totalWeightKg = order.items.reduce((s, i) => s + (Number(i.sku?.weight) || 0) * i.quantity, 0);
    const weightStr = totalWeightKg > 0 ? `${totalWeightKg.toFixed(3)} kgs` : '-';
    const dims = order.items.map(i => i.sku?.dimensions).filter(Boolean).join(', ') || '-';

    const orderBarcodeText = `${orderNo}-1`;
    const orderBarcode = await generateBarcode(orderBarcodeText, { scale: 2, height: 10 });
    const shipmentBarcode = awbNumber ? await generateBarcode(awbNumber, { scale: 2, height: 10 }) : null;

    const doc = new PDFDocument({ margin: 15, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label_${orderNo}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const margin = 15;
    const contentW = pageW - margin * 2;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('SELF', pageW - margin - 60, margin, { width: 60, align: 'right' });
    doc.text('SELF', pageW - margin - 60, margin + 11, { width: 60, align: 'right' });

    doc.image(orderBarcode, pageW - margin - 180, margin + 28, { width: 180, height: 36 });
    doc.font('Helvetica').fontSize(7).text(orderBarcodeText, pageW - margin - 180, margin + 66, { width: 180, align: 'center' });

    let leftY = margin;
    doc.fontSize(7).text(`Generated: ${formatDateTimeIN(order.createdAt)}`, margin, leftY, { width: contentW - 200 });
    leftY += 70;

    const rowY = leftY;
    const col1W = 280;
    const col2W = contentW - col1W;

    drawBox(doc, margin, rowY, col1W, 140);
    doc.font('Helvetica-Bold').fontSize(9).text('Name & Delivery Address', margin + 4, rowY + 4, { width: col1W - 8 });
    doc.font('Helvetica-Bold').fontSize(10).text(order.customerName, margin + 4, rowY + 18, { width: col1W - 8 });
    doc.font('Helvetica').fontSize(8);
    let ya = rowY + 32;
    const addrLines = (order.shippingAddress || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    addrLines.slice(0, 6).forEach(line => {
      doc.text(line, margin + 4, ya, { width: col1W - 8 });
      ya += 12;
    });
    if (order.notificationMobile) {
      doc.font('Helvetica').fontSize(8).text(`Contact Number: ${order.notificationMobile}`, margin + 4, ya + 4, { width: col1W - 8 });
    }

    drawBox(doc, margin + col1W, rowY, col2W, 140);
    let ry = rowY + 4;
    doc.font('Helvetica').fontSize(8).text('Payment Mode:', margin + col1W + 4, ry);
    doc.font('Helvetica-Bold').fontSize(9).text(paymentMode, margin + col1W + 90, ry);
    ry += 18;
    doc.font('Helvetica').fontSize(9).text('Order No:', margin + col1W + 4, ry);
    doc.font('Helvetica-Bold').fontSize(11).text(orderNo, margin + col1W + 60, ry, { width: col2W - 70 });
    ry += 16;
    doc.font('Helvetica').fontSize(8).text('Channel Name:', margin + col1W + 4, ry);
    doc.font('Helvetica-Bold').fontSize(8).text(channelName, margin + col1W + 80, ry, { width: col2W - 90 });
    ry += 16;
    if (shipmentBarcode) {
      doc.font('Helvetica').fontSize(7).text('Shipment Id', margin + col1W + 4, ry, { width: col2W - 8, align: 'center' });
      doc.image(shipmentBarcode, margin + col1W + (col2W - 140) / 2, ry + 10, { width: 140, height: 26 });
      doc.font('Helvetica').fontSize(8).text(shipmentId, margin + col1W + 4, ry + 38, { width: col2W - 8, align: 'center' });
      ry += 52;
    }
    doc.font('Helvetica').fontSize(7);
    doc.text(`Invoice No: ${invoiceNo}`, margin + col1W + 4, ry);
    ry += 9;
    doc.text(`Invoice Created Date: ${formatDateTimeIN(order.createdAt)}`, margin + col1W + 4, ry);
    ry += 9;
    if (awbNumber) {
      doc.text(`Shipment ID: ${awbNumber}`, margin + col1W + 4, ry);
      ry += 9;
    }
    doc.text(`Routing Code:  | Cluster Code:  | Voucher Code:`, margin + col1W + 4, ry);

    const midY = rowY + 140 + 4;
    drawBox(doc, margin, midY, contentW, 18);
    doc.font('Helvetica').fontSize(8);
    doc.text(`No. of Boxes - 1`, margin + 4, midY + 5, { width: contentW / 3 - 8 });
    doc.text(`Weight:${weightStr}`, margin + contentW / 3 + 4, midY + 5, { width: contentW / 3 - 8 });
    doc.text(`Dimensions: ${dims}`, margin + (contentW * 2) / 3 + 4, midY + 5, { width: contentW / 3 - 8 });

    const tableY = midY + 18 + 4;
    const cols = [
      { key: 'sr',       label: 'S.No.',     w: 30,  align: 'center' as const },
      { key: 'desc',     label: 'Description', w: 150, align: 'left' as const },
      { key: 'brand',    label: 'Brand',     w: 100, align: 'left' as const },
      { key: 'qty',      label: 'Qty',       w: 50,  align: 'right' as const },
      { key: 'rate',     label: 'Rate',      w: 60,  align: 'right' as const },
      { key: 'discount', label: 'Discount',  w: 50,  align: 'right' as const },
      { key: 'amount',   label: 'Amount',    w: 75,  align: 'right' as const },
    ];
    let cx = margin;
    doc.font('Helvetica-Bold').fontSize(8);
    cols.forEach(c => {
      drawCell(doc, cx, tableY, c.w, 18, c.label, { size: 8, bold: true, align: c.align });
      cx += c.w;
    });

    let rowH = 0;
    let grandTotal = 0;
    order.items.forEach((item, i) => {
      const code = item.sku?.skuCode || item.skuId || '';
      const name = item.sku?.name || '';
      const brand = item.sku?.brand || '-';
      const qty = item.quantity;
      const total = Number(item.totalAmount);
      const unitPrice = Number(item.unitPrice);
      const discount = Number(item.discountAmount || 0);
      grandTotal += total;

      let cellX = margin;
      const cellH = 16;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[0].w, cellH, String(i + 1), { size: 8, align: 'center' }); cellX += cols[0].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[1].w, cellH, name || code, { size: 8 }); cellX += cols[1].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[2].w, cellH, brand, { size: 8 }); cellX += cols[2].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[3].w, cellH, String(qty), { size: 8, align: 'right' }); cellX += cols[3].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[4].w, cellH, formatINR(unitPrice), { size: 8, align: 'right' }); cellX += cols[4].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[5].w, cellH, formatINR(discount), { size: 8, align: 'right' }); cellX += cols[5].w;
      drawCell(doc, cellX, tableY + 18 + rowH, cols[6].w, cellH, formatINR(total), { size: 8, align: 'right' });
      rowH += cellH;
    });

    let ty = tableY + 18 + rowH;
    const summaryLabelW = cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w;
    drawCell(doc, margin, ty, summaryLabelW, 16, 'Prepaid Amount', { size: 8, bold: true, align: 'right' });
    drawCell(doc, margin + summaryLabelW, ty, cols[5].w, 16, String(totalQty), { size: 8, align: 'right' });
    drawCell(doc, margin + summaryLabelW + cols[5].w, ty, cols[6].w, 16, `(-) ${formatINR(grandTotal)}`, { size: 8, align: 'right' });
    ty += 16;
    drawCell(doc, margin, ty, summaryLabelW + cols[5].w, 16, 'Net Collectable Amount', { size: 8, bold: true, align: 'right' });
    drawCell(doc, margin + summaryLabelW + cols[5].w, ty, cols[6].w, 16, paymentMode === 'COD' ? formatINR(grandTotal) : '0.00', { size: 8, align: 'right' });
    ty += 16;
    drawCell(doc, margin, ty, summaryLabelW + cols[5].w, 16, 'Total', { size: 8, bold: true, align: 'right' });
    drawCell(doc, margin + summaryLabelW + cols[5].w, ty, cols[6].w, 16, formatINR(grandTotal), { size: 8, bold: true, align: 'right' });
    ty += 18;

    doc.font('Helvetica').fontSize(8).text('Prices are inclusive of all applicable taxes', margin, ty, { width: contentW });
    ty += 14;

    doc.font('Helvetica').fontSize(8).text('If Undelivered, please return to :', margin, ty, { width: contentW });
    ty += 12;
    doc.font('Helvetica-Bold').fontSize(9).text(whCode, margin, ty, { width: contentW });
    ty += 12;
    doc.font('Helvetica').fontSize(7).text(whAddress, margin, ty, { width: contentW });

    doc.fontSize(6).fillColor('#666').text('Powered By globalsupply.in', margin, doc.page.height - margin - 10, { width: contentW, align: 'center' }).fillColor('#000');

    doc.end();
  } catch (error) {
    console.error('Shipping label PDF error:', error);
    res.status(500).json({ message: 'Label generation failed', error: String(error) });
  }
};
