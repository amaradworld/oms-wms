import { Response } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middlewares/auth.middleware';

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');

function tryAddLogo(doc: typeof PDFDocument.prototype) {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, doc.x, doc.y, { width: 60 });
      doc.moveDown(3);
    }
  } catch {}
}

export const generateLabel = async (req: AuthRequest, res: Response) => {
  const { skuCode, name, binLocation, brand, mrp } = req.body;

  try {
    const doc = new PDFDocument({ size: [300, 200], margin: 15 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label_${skuCode}.pdf`);
    doc.pipe(res);

    tryAddLogo(doc);

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
