import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getNdrCases = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { status, courier } = req.query;
  const where: any = { tenantId };
  if (status) where.status = status as string;
  if (courier) where.courierName = courier as string;

  const cases = await prisma.ndrCase.findMany({
    where,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          shippingAddress: true,
          orderStatus: true,
          tracking: { select: { awbNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(cases);
};

export const getNdrStats = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const where = { tenantId };

  const [open, reattemptScheduled, resolved, closed, total] = await Promise.all([
    prisma.ndrCase.count({ where: { ...where, status: 'OPEN' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'REATTEMPT_SCHEDULED' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'RESOLVED' } }),
    prisma.ndrCase.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.ndrCase.count({ where }),
  ]);

  res.json({ total, open, reattemptScheduled, resolved, closed });
};

export const createNdrCase = async (req: AuthRequest, res: Response) => {
  const { orderId, failureReason } = req.body;
  const tenantId = req.user!.tenant_id;

  if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

  const existing = await prisma.ndrCase.findFirst({ where: { orderId, status: { not: 'CLOSED' } } });
  if (existing) return res.status(409).json({ message: 'Open NDR case already exists for this order', ndr: existing });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const ndr = await prisma.ndrCase.create({
    data: {
      tenantId,
      orderId,
      courierName: order.tracking?.courierName || 'UNKNOWN',
      awbNumber: order.tracking?.awbNumber || null,
      failureReason: failureReason || 'Delivery failed',
    },
    include: {
      order: { select: { orderNumber: true, customerName: true, orderStatus: true } },
    },
  });

  res.status(201).json(ndr);
};

export const scheduleReattempt = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { reattemptDate, notes } = req.body;

  if (!reattemptDate) return res.status(400).json({ message: 'Reattempt date is required' });

  const ndr = await prisma.ndrCase.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!ndr) return res.status(404).json({ message: 'NDR case not found' });

  const updated = await prisma.ndrCase.update({
    where: { id },
    data: {
      status: 'REATTEMPT_SCHEDULED',
      reattemptDate: new Date(reattemptDate),
      notes: notes || ndr.notes,
    },
  });

  res.json(updated);
};

export const resolveNdrCase = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { notes } = req.body;

  const ndr = await prisma.ndrCase.findFirst({ where: { id, tenantId: req.user!.tenant_id } });
  if (!ndr) return res.status(404).json({ message: 'NDR case not found' });

  const updated = await prisma.ndrCase.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      notes: notes || ndr.notes,
    },
  });

  res.json(updated);
};
