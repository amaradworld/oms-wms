import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;

  try {
    const totalOrders = await prisma.order.count({ where: { tenantId: tenant_id } });
    const pendingOrders = await prisma.order.count({ where: { tenantId: tenant_id, orderStatus: 'PENDING' } });
    const totalRevenue = await prisma.orderItem.aggregate({ _sum: { totalAmount: true } });
    const ordersByStatus = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: true,
      where: { tenantId: tenant_id },
    });

    const lowStockItems = await prisma.inventory.findMany({
      where: { quantityAvailable: { lte: 10 } },
      include: { sku: true, warehouse: true },
      take: 5,
    });

    res.json({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      ordersByStatus: ordersByStatus || [],
      lowStockItems: lowStockItems || [],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error });
  }
};
