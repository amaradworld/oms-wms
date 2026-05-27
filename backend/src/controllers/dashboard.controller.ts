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
    const totalRevenue = await prisma.orderItem.aggregate({ _sum: { totalAmount: true } });
    const ordersByStatus = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: true,
      where: orderWhere,
    });

    const lowStockItems = (await prisma.inventory.findMany({
      where: invWhere,
      include: { sku: true, warehouse: true },
    })).filter(i => i.reorderPoint > 0 && i.quantityAvailable <= i.reorderPoint).slice(0, 5);

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
