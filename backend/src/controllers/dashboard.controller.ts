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

    const activeSkus = await prisma.inventory.count({
      where: { ...invWhere, quantityOnHand: { gt: 0 } },
    });

    const lowStockItems = (await prisma.inventory.findMany({
      where: invWhere,
      include: { sku: true, warehouse: true },
    })).filter(i => i.reorderPoint > 0 && i.quantityAvailable <= i.reorderPoint).slice(0, 5);

    const inventoryAgg = await prisma.inventory.aggregate({
      where: invWhere,
      _sum: { quantityOnHand: true, quantityAvailable: true, quantityBlocked: true },
    });
    const totalQtyOnHand = inventoryAgg._sum.quantityOnHand || 0;
    const totalQtyAvailable = inventoryAgg._sum.quantityAvailable || 0;
    const totalQtyBlocked = inventoryAgg._sum.quantityBlocked || 0;

    const brandAgg = await prisma.inventory.groupBy({
      by: ['skuId'],
      where: { ...invWhere, quantityOnHand: { gt: 0 } },
      _sum: { quantityOnHand: true },
    });
    const skuIds = brandAgg.map(b => b.skuId);
    const skusWithBrand = await prisma.skuMaster.findMany({
      where: { id: { in: skuIds } },
      select: { id: true, brand: true, mrp: true },
    });
    const skuMap = new Map(skusWithBrand.map(s => [s.id, s]));
    const brandMap = new Map<string, number>();
    let totalInventoryValue = 0;
    for (const b of brandAgg) {
      const sku = skuMap.get(b.skuId);
      const brand = sku?.brand || 'Uncategorized';
      brandMap.set(brand, (brandMap.get(brand) || 0) + (b._sum.quantityOnHand || 0));
      if (sku?.mrp) totalInventoryValue += Number(sku.mrp) * (b._sum.quantityOnHand || 0);
    }
    const brandWise = Array.from(brandMap.entries()).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);

    const categoryAgg = await prisma.skuMaster.groupBy({
      by: ['category'],
      where: { tenantId: tenant_id },
      _count: { id: true },
    });
    const categoryWise = categoryAgg.map(c => ({ category: c.category || 'Uncategorized', count: c._count.id })).sort((a, b) => b.count - a.count);

    const warehouseAgg = await prisma.inventory.groupBy({
      by: ['warehouseId'],
      where: invWhere,
      _sum: { quantityOnHand: true },
    });
    const warehouseIds = warehouseAgg.map(w => w.warehouseId);
    const warehouses = await prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, name: true },
    });
    const whMap = new Map(warehouses.map(w => [w.id, w.name]));
    const warehouseWise = warehouseAgg.map(w => ({ name: whMap.get(w.warehouseId) || 'Unknown', count: w._sum.quantityOnHand || 0 })).sort((a, b) => b.count - a.count);

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
      totalQtyOnHand,
      totalQtyAvailable,
      totalQtyBlocked,
      totalInventoryValue,
      brandWise: brandWise.slice(0, 10),
      categoryWise: categoryWise.slice(0, 10),
      warehouseWise: warehouseWise.slice(0, 10),
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
