import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string | undefined;

  try {
    const orderWhere: any = { tenantId: tenant_id };
    const invWhere: any = { warehouse: { tenantId: tenant_id } };
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
      take: 500,
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
    res.status(500).json({ message: 'Error fetching dashboard' });
  }
};

export const getDashboardDetails = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const warehouseId = req.query.warehouseId as string | undefined;
  const type = req.query.type as string;

  const orderWhere: any = { tenantId: tenant_id };
  const invWhere: any = { warehouse: { tenantId: tenant_id } };
  if (warehouseId) { orderWhere.warehouseId = warehouseId; invWhere.warehouseId = warehouseId; }

  const now = new Date();

  try {
    let rows: any[] = [];
    let columns: string[] = [];

    switch (type) {
      case 'totalOrders': {
        const orders = await prisma.order.findMany({
          where: orderWhere,
          select: {
            orderNumber: true, customerName: true, source: true, orderStatus: true,
            paymentStatus: true, orderAmount: true, createdAt: true, slaDeadline: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Status': o.orderStatus, 'Payment': o.paymentStatus || '-',
          'Amount': o.orderAmount ? Number(o.orderAmount) : 0,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
          'SLA Deadline': o.slaDeadline ? new Date(o.slaDeadline).toLocaleString() : '-',
        }));
        break;
      }
      case 'pendingOrders': {
        const orders = await prisma.order.findMany({
          where: { ...orderWhere, orderStatus: 'PENDING' },
          select: {
            orderNumber: true, customerName: true, source: true, orderAmount: true,
            createdAt: true, slaDeadline: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Amount': o.orderAmount ? Number(o.orderAmount) : 0,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
          'SLA Deadline': o.slaDeadline ? new Date(o.slaDeadline).toLocaleString() : '-',
        }));
        break;
      }
      case 'revenue': {
        const items = await prisma.orderItem.findMany({
          where: { order: { tenantId: tenant_id, ...(warehouseId ? { warehouseId } : {}) } },
          include: { order: { select: { orderNumber: true, source: true } }, sku: { select: { skuCode: true, name: true } } },
          orderBy: { order: { createdAt: 'desc' } },
          take: 500,
        });
        rows = items.map(i => ({
          'Order #': i.order.orderNumber, 'SKU': i.sku.skuCode, 'Product': i.sku.name,
          'Qty': i.quantity, 'Unit Price': Number(i.unitPrice), 'Total': Number(i.totalAmount),
          'Source': i.order.source || '-',
        }));
        break;
      }
      case 'activeSkus': {
        const inv = await prisma.inventory.findMany({
          where: { ...invWhere, quantityOnHand: { gt: 0 } },
          include: { sku: { select: { skuCode: true, name: true, brand: true } }, warehouse: { select: { name: true } } },
          orderBy: { quantityOnHand: 'desc' },
          take: 500,
        });
        rows = inv.map(i => ({
          'SKU': i.sku.skuCode, 'Product': i.sku.name, 'Brand': i.sku.brand || '-',
          'Warehouse': i.warehouse?.name || '-', 'Bin': i.binLocation,
          'On Hand': i.quantityOnHand, 'Available': i.quantityAvailable,
          'Reserved': i.quantityReserved, 'Reorder Point': i.reorderPoint,
        }));
        break;
      }
      case 'slaBreached': {
        const orders = await prisma.order.findMany({
          where: { ...orderWhere, slaDeadline: { not: null, lt: now }, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
          select: {
            orderNumber: true, customerName: true, source: true, orderStatus: true,
            slaDeadline: true, createdAt: true,
          },
          orderBy: { slaDeadline: 'asc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Status': o.orderStatus,
          'SLA Deadline': new Date(o.slaDeadline!).toLocaleString(),
          'Breached By': `${Math.round((now.getTime() - new Date(o.slaDeadline!).getTime()) / 60000)} min`,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
        }));
        break;
      }
      case 'slaAtRisk': {
        const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const orders = await prisma.order.findMany({
          where: { ...orderWhere, slaDeadline: { gte: now, lt: twoHours }, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
          select: {
            orderNumber: true, customerName: true, source: true, orderStatus: true,
            slaDeadline: true, createdAt: true,
          },
          orderBy: { slaDeadline: 'asc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Status': o.orderStatus,
          'SLA Deadline': new Date(o.slaDeadline!).toLocaleString(),
          'Time Left': `${Math.round((new Date(o.slaDeadline!).getTime() - now.getTime()) / 60000)} min`,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
        }));
        break;
      }
      case 'slaOnTrack': {
        const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const orders = await prisma.order.findMany({
          where: { ...orderWhere, slaDeadline: { gte: twoHours }, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
          select: {
            orderNumber: true, customerName: true, source: true, orderStatus: true,
            slaDeadline: true, createdAt: true,
          },
          orderBy: { slaDeadline: 'asc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Status': o.orderStatus,
          'SLA Deadline': new Date(o.slaDeadline!).toLocaleString(),
          'Time Left': `${Math.round((new Date(o.slaDeadline!).getTime() - now.getTime()) / 3600000)}h`,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
        }));
        break;
      }
      case 'noSla': {
        const orders = await prisma.order.findMany({
          where: { ...orderWhere, slaDeadline: null, orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] } },
          select: {
            orderNumber: true, customerName: true, source: true, orderStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        rows = orders.map(o => ({
          'Order #': o.orderNumber, 'Customer': o.customerName, 'Source': o.source || '-',
          'Status': o.orderStatus,
          'Created': o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-',
        }));
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid type' });
    }

    res.json({ rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching details' });
  }
};
