import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const generateInvoice = async (req: AuthRequest, res: Response) => {
  const orderId = req.params.orderId as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { sku: { select: { skuCode: true, name: true } } } },
        warehouse: { select: { name: true } },
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Invoice #: INV-${order.orderNumber}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('Ship To:');
    doc.fontSize(10).font('Helvetica').text(order.customerName);
    doc.text(order.shippingAddress);
    if (order.warehouse) doc.text(`From: ${order.warehouse.name}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('SKU', 50, tableTop);
    doc.text('Item', 130, tableTop);
    doc.text('Qty', 330, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 380, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 460, tableTop, { width: 70, align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    let y = tableTop + 25;
    let grandTotal = 0;

    order.items.forEach(item => {
      const code = item.sku?.skuCode || item.skuId || '';
      const name = item.sku?.name || '';
      const total = Number(item.totalAmount);
      grandTotal += total;

      doc.fontSize(9).font('Helvetica');
      doc.text(code, 50, y, { width: 75 });
      doc.text(name, 130, y, { width: 195 });
      doc.text(item.quantity.toString(), 330, y, { width: 50, align: 'right' });
      doc.text(Number(item.unitPrice).toFixed(2), 380, y, { width: 70, align: 'right' });
      doc.text(total.toFixed(2), 460, y, { width: 70, align: 'right' });
      y += 18;
    });

    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 8;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`Grand Total: \u20B9 ${grandTotal.toFixed(2)}`, 380, y, { width: 150, align: 'right' });

    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#888');
    doc.text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Invoice generation failed', error: String(error) });
  }
};
