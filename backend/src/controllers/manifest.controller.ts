import { Response } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');

function tryAddLogo(doc: typeof PDFDocument.prototype, options?: { x?: number }) {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, options?.x ?? 30, doc.y, { width: 80 });
      doc.moveDown(4);
    }
  } catch {}
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

export const downloadManifestPdf = async (req: AuthRequest, res: Response) => {
  const manifest = await prisma.manifest.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenant_id },
    include: {
      shipments: {
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              shippingAddress: true,
              tracking: { select: { awbNumber: true } },
            },
          },
        },
      },
    },
  });
  if (!manifest) return res.status(404).json({ message: 'Manifest not found' });

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=manifest_${manifest.manifestNumber}.pdf`);
    doc.pipe(res);

    tryAddLogo(doc);

    doc.fontSize(16).font('Helvetica-Bold').text('Manifest / Handover Summary', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Manifest #: ${manifest.manifestNumber}`, { align: 'center' });
    doc.text(`Courier: ${manifest.courierName}`, { align: 'center' });
    doc.text(`Status: ${manifest.status}`, { align: 'center' });
    doc.text(`Date: ${manifest.createdAt.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    const tableTop = doc.y;
    const col1 = 30, col2 = 140, col3 = 280, col4 = 400, col5 = 480;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Order #', col1, tableTop);
    doc.text('Customer', col2, tableTop);
    doc.text('Shipping Address', col3, tableTop);
    doc.text('AWB', col4, tableTop);
    doc.text('Status', col5, tableTop);

    doc.moveDown(0.3);
    doc.fontSize(7).font('Helvetica');

    let y = doc.y;
    manifest.shipments.forEach((s, i) => {
      if (y > 700) {
        doc.addPage();
        y = 30;
      }
      const o = s.order;
      doc.text(o.orderNumber, col1, y);
      doc.text(o.customerName || '-', col2, y);
      doc.text((o.shippingAddress || '').substring(0, 30), col3, y);
      doc.text(s.awbNumber, col4, y);
      doc.text(o.tracking ? 'SHIPPED' : '-', col5, y);
      y += 14;
    });

    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(`Total Shipments: ${manifest.shipments.length}`, { align: 'left' });
    doc.text(`Generated by OMS-WMS at ${new Date().toLocaleString()}`, { align: 'left' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'PDF generation failed', error: String(error) });
  }
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
