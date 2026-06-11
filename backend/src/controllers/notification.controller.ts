import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendAlertEmail } from '../services/email.service';
import { logAudit } from '../services/audit.service';
import { runSlaCron } from '../services/slaCron.service';

const DEFAULT_PREFS = {
  stockExpiry: true,
  slaBreach: true,
  lowStock: true,
  rtoAlert: true,
  syncFailure: true,
  weeklyReport: false,
};

async function getTenantPrefs(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return { ...DEFAULT_PREFS, ...((tenant?.notificationPrefs as Record<string, boolean>) || {}) };
}

export async function checkAndSendAlerts(tenantId: string) {
  const prefs = await getTenantPrefs(tenantId);
  const now = new Date();
  const threshold30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (prefs.stockExpiry) {
    const expiringItems = await prisma.inventory.findMany({
      where: {
        expiryDate: { not: null, lte: threshold30 },
        expiryAlertSent: false,
        quantityOnHand: { gt: 0 },
        warehouse: { tenantId },
      },
      include: { sku: true, warehouse: true },
    });

    for (const item of expiringItems) {
      const daysLeft = Math.ceil((item.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30) {
        const admins = await prisma.user.findMany({ where: { tenantId, role: { in: ['SUPER_ADMIN', 'WAREHOUSE_MGR'] } } });
        for (const admin of admins) {
          try {
            await sendAlertEmail(
              admin.email,
              'Stock Expiry Alert',
              `Item ${item.sku?.skuCode} in ${item.warehouse?.name} expires in ${daysLeft} days`,
              `SKU: ${item.sku?.skuCode}\nWarehouse: ${item.warehouse?.name}\nExpiry Date: ${item.expiryDate?.toISOString().split('T')[0]}\nDays Left: ${daysLeft}`
            );
          } catch (e) {
            console.error(`[Notification] Failed to send expiry alert to ${admin.email}:`, e);
          }
        }
        await prisma.inventory.update({ where: { id: item.id }, data: { expiryAlertSent: true } });
      }
    }
  }

  if (prefs.slaBreach) {
    const breached = await prisma.order.findMany({
      where: {
        tenantId,
        slaDeadline: { lt: now },
        orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] },
        OR: [{ slaBreachedAt: null }, { slaStatus: { not: 'BREACHED' } }],
      },
      take: 10,
    });

    if (breached.length > 0) {
      const admins = await prisma.user.findMany({ where: { tenantId, role: 'SUPER_ADMIN' } });
      for (const admin of admins) {
        try {
          await sendAlertEmail(
            admin.email,
            'SLA Breach Alert',
            `${breached.length} orders have breached their SLA deadline`,
            `Orders affected: ${breached.map(b => b.orderNumber).join(', ')}\nTotal: ${breached.length} orders`
          );
        } catch (e) {
          console.error(`[Notification] Failed to send SLA breach alert to ${admin.email}:`, e);
        }
      }
      if (admins.length > 0) {
        await logAudit({
          tenantId,
          userId: admins[0].id,
          action: 'SLA_BREACH',
          entityType: 'Order',
          newValue: { count: breached.length, orderIds: breached.map(b => b.id), sentAt: now.toISOString() } as any,
        });
      }
      await prisma.order.updateMany({
        where: { id: { in: breached.map(b => b.id) } },
        data: { slaStatus: 'BREACHED', slaBreachedAt: now },
      });
    }
  }

  if (prefs.lowStock) {
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantityOnHand: { gt: 0 },
        warehouse: { tenantId },
      },
      include: { sku: true },
      take: 10,
    });
    const filtered = lowStockItems.filter(i => i.quantityAvailable <= i.reorderPoint);

    if (filtered.length > 0) {
      const admins = await prisma.user.findMany({ where: { tenantId, role: { in: ['SUPER_ADMIN', 'WAREHOUSE_MGR'] } } });
      for (const admin of admins) {
        try {
          await sendAlertEmail(
            admin.email,
            'Low Stock Alert',
            `${filtered.length} items are running low on stock`,
            `Items below reorder point:\n${filtered.map(i => `- ${i.sku?.skuCode}: ${i.quantityAvailable} units (reorder at ${i.reorderPoint})`).join('\n')}`
          );
        } catch (e) {
          console.error(`[Notification] Failed to send low stock alert to ${admin.email}:`, e);
        }
      }
    }
  }
}

export const triggerAlerts = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  try {
    await checkAndSendAlerts(tenant_id);
    res.json({ message: 'Alerts checked and sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send alerts',  });
  }
};

export const triggerSlaCron = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await runSlaCron();
    res.json({ message: 'SLA cron completed', ...result });
  } catch (error) {
    res.status(500).json({ message: 'SLA cron failed', });
  }
};

export const getNotificationLog = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const slaLabels = ['LOW_STOCK', 'SLA_BREACH', 'RTO_ALERT', 'SYNC_FAILURE', 'STOCK_EXPIRY'];
  const notifications = [];

  for (const label of slaLabels) {
    const count = await prisma.auditLog.count({
      where: { tenantId: tenant_id, action: label, timestamp: { gte: thirtyDays } },
    });
    notifications.push({ type: label, count, last30Days: count });
  }

  res.json(notifications);
};

export const getPreferences = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  try {
    const prefs = await getTenantPrefs(tenant_id);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch preferences',  });
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  const { tenant_id } = req.user!;
  try {
    const existing = await getTenantPrefs(tenant_id);
    const updated = { ...existing, ...req.body };
    await prisma.tenant.update({
      where: { id: tenant_id },
      data: { notificationPrefs: updated },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update preferences',  });
  }
};
