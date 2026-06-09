import { Response } from 'express';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateBarcode, numberToWords, formatINR, formatDateIN } from '../utils/pdf-utils';

const GST_RATE = 0.09;

function drawBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
}

function drawCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; size?: number; align?: 'left' | 'right' | 'center' } = {}) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 7);
  doc.text(text || '', x + 2, y + 2, { width: w - 4, height: h - 4, align: opts.align || 'left', ellipsis: true });
}

async function getNextInvoiceNumber(tenantId: string, warehouseId: string): Promise<string> {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { code: true, name: true } });
  const prefix = (warehouse?.code || warehouse?.name || 'WH').slice(0, 3).toUpperCase();

  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId, warehouseId, isCreditNote: false },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) seq = parseInt(match[1]) + 1;
  }

  return `${prefix}-INV-${String(seq).padStart(6, '0')}`;
}

async function getNextCreditNoteNumber(tenantId: string, warehouseId: string): Promise<string> {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { code: true, name: true } });
  const prefix = (warehouse?.code || warehouse?.name || 'WH').slice(0, 3).toUpperCase();

  const lastCN = await prisma.invoice.findFirst({
    where: { tenantId, warehouseId, isCreditNote: true },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (lastCN) {
    const match = lastCN.invoiceNumber.match(/(\d+)$/);
    if (match) seq = parseInt(match[1]) + 1;
  }

  return `${prefix}-CN-${String(seq).padStart(6, '0')}`;
}

export const createInvoice = async (req: AuthRequest, res: Response) => {
  const { orderId } = req.body;
  const tenantId = req.user!.tenant_id;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: { include: { sku: { select: { skuCode: true, name: true, hsnCode: true } } } }, warehouse: true, invoice: true },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.invoice) return res.status(409).json({ message: 'Invoice already exists', invoice: order.invoice });
  if (!order.warehouseId) return res.status(400).json({ message: 'Order has no warehouse assigned' });

  const invoiceNumber = await getNextInvoiceNumber(tenantId, order.warehouseId);

  let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalAmount = 0;
  for (const item of order.items) {
    const lineTotal = Number(item.totalAmount);
    const taxable = +(lineTotal / (1 + GST_RATE * 2)).toFixed(2);
    totalTaxable += taxable;
    totalCGST += +(taxable * GST_RATE).toFixed(2);
    totalSGST += +(taxable * GST_RATE).toFixed(2);
    totalAmount += lineTotal;
  }

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      warehouseId: order.warehouseId,
      orderId: order.id,
      invoiceNumber,
      totalAmount,
      taxAmount: +(totalCGST + totalSGST).toFixed(2),
      cgstAmount: totalCGST,
      sgstAmount: totalSGST,
      status: 'ISSUED',
    },
  });

  res.status(201).json(invoice);
};

export const getInvoices = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { warehouseId, status, isCreditNote } = req.query;
  const where: any = { tenantId };
  if (warehouseId) where.warehouseId = warehouseId as string;
  if (status) where.status = status as string;
  if (isCreditNote !== undefined) where.isCreditNote = isCreditNote === 'true';

  const invoices = await prisma.invoice.findMany({
    where,
    include: { order: { select: { orderNumber: true, customerName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invoices);
};

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      order: {
        include: {
          items: { include: { sku: { select: { skuCode: true, name: true, hsnCode: true } } } },
          warehouse: { select: { name: true, code: true, address: true, gstin: true } },
          tracking: { select: { awbNumber: true, courierName: true } },
        },
      },
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
};

export const requestEinvoice = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenant_id;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId },
    include: { order: { include: { items: { include: { sku: { select: { hsnCode: true, name: true } } } }, warehouse: true } } },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.irn) return res.status(409).json({ message: 'IRN already generated', irn: invoice.irn });

  const irpApiUrl = process.env.EINVOICE_API_URL;
  const irpApiKey = process.env.EINVOICE_API_KEY;

  if (!irpApiUrl || !irpApiKey) {
    const mockIrn = `IRN${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await prisma.invoice.update({ where: { id }, data: { irn: mockIrn, irnGeneratedAt: new Date() } });
    return res.json({ irn: mockIrn, message: 'IRN generated (demo mode)', mode: 'demo' });
  }

  try {
    const order = (invoice as any).order;
    const sellerGstin = order.warehouse?.gstin || '';
    const items = order.items.map(i => ({
      product_name: i.sku?.name || '',
      hsn_code: i.sku?.hsnCode || '',
      quantity: i.quantity,
      unit_price: Number(i.unitPrice),
      total_amount: Number(i.totalAmount),
      tax_rate: 18,
    }));

    const payload = {
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate.toISOString().split('T')[0],
      seller_gstin: sellerGstin,
      buyer_gstin: order.customerGstin || 'URP',
      total_amount: Number(invoice.totalAmount),
      tax_amount: Number(invoice.taxAmount),
      items,
    };

    const response = await fetch(`${irpApiUrl}/api/v1/einvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${irpApiKey}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return res.status(502).json({ message: `IRP API error ${response.status}`, detail: errBody.slice(0, 200) });
    }

    const result = await response.json();
    const irn = result.irn || result.Irn;
    const ewayBillNo = result.eway_bill_no || result.EwayBillNo;

    await prisma.invoice.update({
      where: { id },
      data: { irn, irnGeneratedAt: new Date(), ewayBillNumber: ewayBillNo || invoice.ewayBillNumber },
    });

    // Also update order IRN
    await prisma.order.update({ where: { id: order.id }, data: { irn } }).catch(() => {});

    res.json({ irn, ewayBillNo, message: 'E-invoice generated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'E-invoice generation failed', detail: err.message });
  }
};

export const generateCreditNote = async (req: AuthRequest, res: Response) => {
  const { orderId, reason, amount } = req.body;
  const tenantId = req.user!.tenant_id;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { invoice: true, warehouse: true },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!order.invoice) return res.status(400).json({ message: 'No invoice found for this order' });
  if (!order.warehouseId) return res.status(400).json({ message: 'Order has no warehouse' });

  const cnNumber = await getNextCreditNoteNumber(tenantId, order.warehouseId);
  const cnAmount = amount ? parseFloat(amount) : Number(order.invoice.totalAmount);
  const taxAmount = +(cnAmount / (1 + GST_RATE * 2) * (GST_RATE * 2)).toFixed(2);

  const creditNote = await prisma.invoice.create({
    data: {
      tenantId,
      warehouseId: order.warehouseId,
      orderId: order.id,
      invoiceNumber: cnNumber,
      totalAmount: cnAmount,
      taxAmount,
      cgstAmount: +(taxAmount / 2).toFixed(2),
      sgstAmount: +(taxAmount / 2).toFixed(2),
      status: 'ISSUED',
      isCreditNote: true,
      creditNoteReason: reason || 'Return adjustment',
    },
  });

  res.status(201).json(creditNote);
};

export const cancelInvoice = async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
};

export const setEwayBill = async (req: AuthRequest, res: Response) => {
  const id = req.params.orderId as string;
  const { ewayBillNumber, irn } = req.body;

  const order = await prisma.order.findFirst({ where: { id, tenantId: req.user!.tenant_id }, include: { invoice: true } });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const updated = await prisma.order.update({
    where: { id },
    data: { ...(ewayBillNumber ? { ewayBillNumber } : {}), ...(irn ? { irn } : {}) },
  });

  // Also update invoice if exists
  if (order.invoice || irn) {
    await prisma.invoice.updateMany({
      where: { orderId: id },
      data: { ...(ewayBillNumber ? { ewayBillNumber } : {}), ...(irn ? { irn, irnGeneratedAt: new Date() } : {}) },
    });
  }

  res.json({ message: 'E-way bill updated', ewayBillNumber: updated.ewayBillNumber, irn: updated.irn });
};

export const generateInvoicePdf = async (req: AuthRequest, res: Response) => {
  const orderId = req.params.orderId as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { sku: { select: { skuCode: true, name: true, brand: true, hsnCode: true, weight: true } } } },
        warehouse: { select: { name: true, code: true, address: true, gstin: true, pan: true, contactPhone: true } },
        tracking: { select: { awbNumber: true, courierName: true } },
        invoice: true,
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const o = order as any;
    const invoiceNo = o.invoice?.invoiceNumber || `INS${String(order.orderNumber).replace(/\D/g, '').slice(-5) || Date.now().toString().slice(-5)}`;
    const orderNo = String(order.orderNumber);
    const channelName = order.source || 'CUSTOM';
    const paymentMode = (order.paymentMode || 'PREPAID').toUpperCase();
    const sellerGstin = order.warehouse?.gstin || '';
    const sellerName = order.warehouse?.code || order.warehouse?.name?.toUpperCase().replace(/\s+/g, ' ') + ' WH' || 'WAREHOUSE';
    const sellerAddress = order.warehouse?.address || '-';
    const awbNumber = order.tracking?.awbNumber || '';
    const courier = order.tracking?.courierName || 'SELF';

    const orderBarcode = await generateBarcode(orderNo, { scale: 2, height: 10 });
    const awbBarcode = awbNumber ? await generateBarcode(awbNumber, { scale: 2, height: 10 }) : null;

    const doc = new PDFDocument({ margin: 20, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderNo}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const margin = 20;
    const contentW = pageW - margin * 2;

    doc.font('Helvetica-Bold').fontSize(12).text('Tax Invoice', 0, margin, { width: pageW, align: 'center' });
    doc.y = margin + 18;

    const row1Y = doc.y;
    const col1W = 200, col2W = contentW - 200 - 170, col3W = 170;

    drawBox(doc, margin, row1Y, col1W, 90);
    doc.font('Helvetica-Bold').fontSize(9).text(sellerName, margin + 4, row1Y + 4, { width: col1W - 8 });
    doc.font('Helvetica').fontSize(7);
    let sellerY = row1Y + 16;
    if (sellerAddress) { doc.text(sellerAddress, margin + 4, sellerY, { width: col1W - 8 }); sellerY += 14; }
    doc.text(`GSTIN: ${sellerGstin}`, margin + 4, sellerY, { width: col1W - 8 });

    drawBox(doc, margin + col1W, row1Y, col2W, 90);
    doc.font('Helvetica').fontSize(7).text('Invoice No:', margin + col1W + 4, row1Y + 4);
    doc.font('Helvetica-Bold').fontSize(9).text(invoiceNo, margin + col1W + 4, row1Y + 14);
    doc.font('Helvetica').fontSize(7).text(`Order No: ${orderNo}`, margin + col1W + 4, row1Y + 28);
    doc.image(orderBarcode, margin + col1W + 4, row1Y + 38, { width: col2W - 8, height: 30 });
    doc.font('Helvetica').fontSize(6).text(orderNo, margin + col1W + 4, row1Y + 70, { width: col2W - 8, align: 'center' });

    const c3x = margin + col1W + col2W;
    drawBox(doc, c3x, row1Y, col3W, 90);
    doc.font('Helvetica').fontSize(7).text('Invoice Date', c3x + 4, row1Y + 4);
    doc.font('Helvetica-Bold').fontSize(9).text(formatDateIN(o.invoice?.invoiceDate || order.createdAt), c3x + 4, row1Y + 14);
    doc.font('Helvetica').fontSize(7).text('Portal:', c3x + 4, row1Y + 30);
    doc.font('Helvetica-Bold').fontSize(8).text(channelName, c3x + 4, row1Y + 38);
    doc.font('Helvetica').fontSize(7).text('Payment Mode', c3x + 4, row1Y + 52);
    doc.font('Helvetica-Bold').fontSize(9).text(paymentMode, c3x + 4, row1Y + 62);
    if (o.invoice?.irn) {
      doc.font('Helvetica').fontSize(6).text(`IRN: ${o.invoice.irn.slice(0, 30)}`, c3x + 4, row1Y + 78, { width: col3W - 8 });
    }

    const row2Y = row1Y + 90;
    const billW = 200, dispatchW = 170, shipW = contentW - billW - dispatchW;

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
    doc.font('Helvetica').fontSize(7).text(order.shippingAddress, shipX + 4, row2Y + 28, { width: shipW - 8 });

    const dX = shipX + shipW;
    drawBox(doc, dX, row2Y, dispatchW, 80);
    doc.font('Helvetica-Bold').fontSize(8).text('Dispatch Through', dX + 4, row2Y + 4, { width: dispatchW - 8 });
    doc.font('Helvetica-Bold').fontSize(9).text(courier, dX + 4, row2Y + 16, { width: dispatchW - 8 });
    if (awbNumber) {
      doc.font('Helvetica').fontSize(7).text('AWB No', dX + 4, row2Y + 30);
      doc.font('Helvetica-Bold').fontSize(7).text(awbNumber, dX + 4, row2Y + 38, { width: dispatchW - 8 });
      if (awbBarcode) doc.image(awbBarcode, dX + 4, row2Y + 48, { width: dispatchW - 8, height: 22 });
    }

    const tableY = row2Y + 84;
    const cols = [
      { key: 'sr', label: 'Sr No.', w: 28, align: 'center' as const },
      { key: 'name', label: 'Product Name', w: 130, align: 'left' as const },
      { key: 'code', label: 'Product Code.', w: 90, align: 'left' as const },
      { key: 'qty', label: 'Qty', w: 22, align: 'right' as const },
      { key: 'rate', label: 'Rate', w: 50, align: 'right' as const },
      { key: 'taxable', label: 'Taxable Value', w: 55, align: 'right' as const },
      { key: 'cgst', label: 'CGST (INR)', w: 45, align: 'right' as const },
      { key: 'sgst', label: 'SGST (INR)', w: 45, align: 'right' as const },
      { key: 'amount', label: 'Amount (INR)', w: 50, align: 'right' as const },
    ];

    let cx = margin;
    doc.font('Helvetica-Bold').fontSize(7);
    cols.forEach(c => { drawCell(doc, cx, tableY, c.w, 24, c.label, { size: 7, bold: true, align: c.align }); cx += c.w; });

    let totalQty = 0, totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalAmount = 0;
    let rowY = tableY + 24;

    order.items.forEach((item, i) => {
      const code = item.sku?.skuCode || item.skuId || '';
      const name = item.sku?.name || '';
      const hsn = item.sku?.hsnCode || '-';
      const qty = item.quantity;
      const lineTotal = Number(item.totalAmount);
      const unitPrice = Number(item.unitPrice);
      const taxable = +(lineTotal / (1 + GST_RATE * 2)).toFixed(2);
      const cgst = +(taxable * GST_RATE).toFixed(2);
      const sgst = +(taxable * GST_RATE).toFixed(2);

      totalQty += qty; totalTaxable += taxable; totalCGST += cgst; totalSGST += sgst; totalAmount += lineTotal;

      const codeCell = `${code}\nHSN code: ${hsn}`;
      let cellX = margin;
      const cellH = 28;
      drawCell(doc, cellX, rowY, cols[0].w, cellH, String(i + 1), { size: 8, align: 'center' }); cellX += cols[0].w;
      drawCell(doc, cellX, rowY, cols[1].w, cellH, name, { size: 7 }); cellX += cols[1].w;
      drawCell(doc, cellX, rowY, cols[2].w, cellH, codeCell, { size: 7 }); cellX += cols[2].w;
      drawCell(doc, cellX, rowY, cols[3].w, cellH, String(qty), { size: 8, align: 'right' }); cellX += cols[3].w;
      drawCell(doc, cellX, rowY, cols[4].w, cellH, formatINR(unitPrice), { size: 7, align: 'right' }); cellX += cols[4].w;
      drawCell(doc, cellX, rowY, cols[5].w, cellH, formatINR(taxable), { size: 7, align: 'right' }); cellX += cols[5].w;
      drawCell(doc, cellX, rowY, cols[6].w, cellH, `${formatINR(cgst)}\n(9.000%)`, { size: 6, align: 'right' }); cellX += cols[6].w;
      drawCell(doc, cellX, rowY, cols[7].w, cellH, `${formatINR(sgst)}\n(9.000%)`, { size: 6, align: 'right' }); cellX += cols[7].w;
      drawCell(doc, cellX, rowY, cols[8].w, cellH, formatINR(lineTotal), { size: 7, align: 'right' });
      rowY += cellH;
    });

    let cellX = margin;
    const cellH = 18;
    const totalLabelCell = cols[0].w + cols[1].w + cols[2].w;
    drawCell(doc, cellX, rowY, totalLabelCell, cellH, 'Total', { size: 8, bold: true, align: 'right' }); cellX += totalLabelCell;
    drawCell(doc, cellX, rowY, cols[3].w, cellH, String(totalQty), { size: 8, bold: true, align: 'right' }); cellX += cols[3].w;
    drawCell(doc, cellX, rowY, cols[4].w, cellH, '', { size: 7 }); cellX += cols[4].w;
    drawCell(doc, cellX, rowY, cols[5].w, cellH, formatINR(totalTaxable), { size: 7, bold: true, align: 'right' }); cellX += cols[5].w;
    drawCell(doc, cellX, rowY, cols[6].w, cellH, formatINR(totalCGST), { size: 7, bold: true, align: 'right' }); cellX += cols[6].w;
    drawCell(doc, cellX, rowY, cols[7].w, cellH, formatINR(totalSGST), { size: 7, bold: true, align: 'right' }); cellX += cols[7].w;
    drawCell(doc, cellX, rowY, cols[8].w, cellH, formatINR(totalAmount), { size: 7, bold: true, align: 'right' });

    rowY += cellH + 6;
    doc.font('Helvetica-Bold').fontSize(8).text('Amount Chargeable (in words)', margin, rowY); rowY += 12;
    doc.font('Helvetica-Bold').fontSize(9).text(`INR ${numberToWords(Math.floor(totalAmount))} Only`, margin, rowY); rowY += 14;
    doc.font('Helvetica-Bold').fontSize(8).text('Tax is payable on reverse charge basis: No', margin, rowY); rowY += 10;

    const halfW = contentW / 2;
    drawBox(doc, margin, rowY, halfW, 50);
    doc.font('Helvetica-Bold').fontSize(8).text('Declaration', margin + 4, rowY + 4, { width: halfW - 8 });
    doc.font('Helvetica').fontSize(7).text('This is a computer generated Invoice.', margin + 4, rowY + 16, { width: halfW - 8 });
    doc.text('All disputes subject to Delhi Jurisdiction only.', margin + 4, rowY + 28, { width: halfW - 8 });

    drawBox(doc, margin + halfW, rowY, halfW, 50);
    doc.font('Helvetica-Bold').fontSize(8).text(`For ${sellerName}`, margin + halfW + 4, rowY + 4, { width: halfW - 8, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(12).text('~ signed ~', margin + halfW + 4, rowY + 20, { width: halfW - 8, align: 'center' });

    rowY += 54;
    drawBox(doc, margin, rowY, 100, 26);
    doc.font('Helvetica').fontSize(7).text('Bill By:', margin + 4, rowY + 4);
    doc.font('Helvetica-Bold').fontSize(8).text('globalsupply.in', margin + 4, rowY + 14);

    doc.end();
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ message: 'Invoice generation failed' });
  }
};
