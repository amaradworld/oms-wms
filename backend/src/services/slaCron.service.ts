import prisma from './prisma';

const AT_RISK_THRESHOLD_MIN = 120;
let slaCronInterval: NodeJS.Timeout | null = null;

export interface SlaCronResult {
  scanned: number;
  breached: number;
  atRisk: number;
  onTrack: number;
  met: number;
  cancelled: number;
  durationMs: number;
}

export async function runSlaCron(): Promise<SlaCronResult> {
  const startedAt = Date.now();
  const now = new Date();
  const atRiskCutoff = new Date(now.getTime() + AT_RISK_THRESHOLD_MIN * 60 * 1000);
  const result: SlaCronResult = { scanned: 0, breached: 0, atRisk: 0, onTrack: 0, met: 0, cancelled: 0, durationMs: 0 };

  const activeOrders = await prisma.order.findMany({
    where: {
      slaDeadline: { not: null },
      orderStatus: { notIn: ['DELIVERED', 'DISPATCHED', 'CANCELLED', 'RETURNED'] },
    },
    select: { id: true, slaDeadline: true, slaStatus: true, orderStatus: true },
  });
  result.scanned = activeOrders.length;

  const breachedIds: string[] = [];
  const atRiskIds: string[] = [];
  const onTrackIds: string[] = [];

  for (const o of activeOrders) {
    if (!o.slaDeadline) continue;
    if (o.slaDeadline < now) {
      breachedIds.push(o.id);
      result.breached++;
    } else if (o.slaDeadline < atRiskCutoff) {
      atRiskIds.push(o.id);
      result.atRisk++;
    } else {
      onTrackIds.push(o.id);
      result.onTrack++;
    }
  }

  if (breachedIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: breachedIds } },
      data: { slaStatus: 'BREACHED', slaBreachedAt: now },
    });
  }
  if (atRiskIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: atRiskIds } },
      data: { slaStatus: 'AT_RISK' },
    });
  }
  if (onTrackIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: onTrackIds } },
      data: { slaStatus: 'ON_TRACK' },
    });
  }

  const closedOrders = await prisma.order.findMany({
    where: { orderStatus: { in: ['DELIVERED', 'DISPATCHED'] }, slaStatus: { in: ['BREACHED', 'AT_RISK', 'ON_TRACK'] } },
    select: { id: true, slaDeadline: true, deliveredAt: true, dispatchedAt: true },
    take: 1000,
  });
  const metIds: string[] = [];
  for (const o of closedOrders) {
    if (!o.slaDeadline) continue;
    const closeTime = o.deliveredAt || o.dispatchedAt;
    if (closeTime && closeTime <= o.slaDeadline) {
      metIds.push(o.id);
    }
  }
  if (metIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: metIds } },
      data: { slaStatus: 'MET' },
    });
    result.met = metIds.length;
  }

  const cancelled = await prisma.order.updateMany({
    where: { orderStatus: 'CANCELLED', slaStatus: { in: ['BREACHED', 'AT_RISK', 'ON_TRACK'] } },
    data: { slaStatus: 'CANCELLED' },
  });
  result.cancelled = cancelled.count;

  result.durationMs = Date.now() - startedAt;
  return result;
}

export function startSlaCron(intervalMs: number = 5 * 60 * 1000) {
  if (slaCronInterval) return;
  if (process.env.SLA_CRON_DISABLED === 'true') {
    console.log('[sla-cron] disabled via env');
    return;
  }
  console.log(`[sla-cron] starting (interval ${intervalMs}ms)`);
  slaCronInterval = setInterval(() => {
    runSlaCron()
      .then(r => console.log(`[sla-cron] scanned=${r.scanned} breached=${r.breached} atRisk=${r.atRisk} onTrack=${r.onTrack} met=${r.met} in ${r.durationMs}ms`))
      .catch(err => console.error('[sla-cron] error:', err));
  }, intervalMs);
  if ((slaCronInterval as any).unref) (slaCronInterval as any).unref();
  setTimeout(() => {
    runSlaCron().catch(err => console.error('[sla-cron] initial run error:', err));
  }, 15 * 1000);
}

export function stopSlaCron() {
  if (slaCronInterval) {
    clearInterval(slaCronInterval);
    slaCronInterval = null;
  }
}
