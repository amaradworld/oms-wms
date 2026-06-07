import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const globalSearch = async (req: AuthRequest, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  const tenantId = req.user?.tenant_id;
  const isPlatform = req.user?.role === 'PLATFORM_ADMIN';
  const tenantFilter = isPlatform ? {} : { tenantId };

  const limit = 5;
  const [orders, skus, warehouses, suppliers] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { awbNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, orderNumber: true, customerName: true, orderStatus: true },
    }),
    prisma.skuMaster.findMany({
      where: {
        OR: [
          { skuCode: { contains: q, mode: 'insensitive' } },
          { epcCode: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, skuCode: true, name: true, mrp: true },
    }),
    prisma.warehouse.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, name: true, city: true },
    }),
    prisma.supplier.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: { id: true, name: true, phone: true },
    }),
  ]);

  res.json({
    results: [
      ...orders.map((o) => ({
        type: 'order',
        id: o.id,
        label: o.orderNumber,
        subtitle: `${o.customerName || ''} · ${o.orderStatus}`,
      })),
      ...skus.map((s) => ({
        type: 'sku',
        id: s.id,
        label: s.skuCode,
        subtitle: s.name,
      })),
      ...warehouses.map((w) => ({
        type: 'warehouse',
        id: w.id,
        label: w.name,
        subtitle: w.city,
      })),
      ...suppliers.map((s) => ({
        type: 'supplier',
        id: s.id,
        label: s.name,
        subtitle: s.phone,
      })),
    ],
  });
};
