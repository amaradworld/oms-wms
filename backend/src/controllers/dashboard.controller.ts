import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string | undefined;

  try {
    const orderWhere: any = { tenantId: tenant_id };
    const invWhere: any = {};
    if (warehouseId) { orderWhere.warehouseId = warehouseId; invWhere.warehouseId = warehouseId; }

    const totalOrders = await prisma.order.count({ where: orderWhere });
    const pendingOrders = await prisma.order.count({ where: { ...orderWhere, orderStatus: 'PENDING' } });
    const totalRevenue = await prisma.orderItem.aggregate({
      _sum: { totalAmount: true },
      where: { order: { tenantId: tenant_id, ...(warehouseId ? { warehouseId } : {}) } },
    });
    const ordersByStatus = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: true,
      where: orderWhere,
    });

    const activeSkus = await prisma.inventory.count({
      where: { ...invWhere, quantityOnHand: { gt: 0 } },
    });

    const lowStockItems = (await prisma.inventory.findMany({
      where: invWhere,
      include: { sku: true, warehouse: true },
    })).filter(i => i.reorderPoint > 0 && i.quantityAvailable <= i.reorderPoint).slice(0, 5);

    const now = new Date();
    const slaWhere = { ...orderWhere, slaDeadline: { not: null }, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } };
    const allSlaOrders = await prisma.order.findMany({
      where: slaWhere,
      select: { id: true, orderNumber: true, customerName: true, orderStatus: true, slaDeadline: true, source: true, createdAt: true },
      orderBy: { slaDeadline: 'asc' },
    });

    const slaBreached = allSlaOrders.filter(o => o.slaDeadline! < now);
    const slaAtRisk = allSlaOrders.filter(o => o.slaDeadline! >= now && o.slaDeadline! < new Date(now.getTime() + 2 * 60 * 60 * 1000));
    const slaOnTrack = allSlaOrders.filter(o => o.slaDeadline! >= new Date(now.getTime() + 2 * 60 * 60 * 1000));
    const noSla = await prisma.order.count({
      where: { ...orderWhere, slaDeadline: null, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
    });

    res.json({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      activeSkus: activeSkus || 0,
      ordersByStatus: ordersByStatus || [],
      lowStockItems: lowStockItems || [],
      sla: {
        breached: slaBreached.length,
        atRisk: slaAtRisk.length,
        onTrack: slaOnTrack.length,
        noDeadline: noSla,
        total: allSlaOrders.length + noSla,
        breachedOrders: slaBreached.slice(0, 5),
        atRiskOrders: slaAtRisk.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error });
  }
};
