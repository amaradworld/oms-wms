import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../services/prisma';
import fs from 'fs';
import path from 'path';

export const generateInvoice = async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(__dirname, `../../temp/invoice_${order.orderNumber}.pdf`);
    
    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.orderNumber}`);
    doc.text(`Customer: ${order.customerName}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Table Header
    doc.text('Item', 50, 150);
    doc.text('Qty', 200, 150);
    doc.text('Price', 300, 150);
    doc.text('Total', 400, 150);
    doc.moveTo(50, 160).lineTo(500, 160).stroke();

    // Items
    let y = 170;
    let grandTotal = 0;
    order.items.forEach(item => {
      doc.text(item.skuId, 50, y);
      doc.text(item.quantity.toString(), 200, y);
      doc.text(item.unitPrice.toString(), 300, y);
      doc.text(item.totalAmount.toString(), 400, y);
      grandTotal += Number(item.totalAmount);
      y += 20;
    });

    doc.moveTo(50, y).lineTo(500, y).stroke();
    doc.text(`Grand Total: ${grandTotal}`, 400, y + 20, { bold: true });

    doc.end();

    res.json({ message: 'Invoice generated', url: filePath });
  } catch (error) {
    res.status(500).json({ message: 'Invoice generation failed', error });
  }
};
