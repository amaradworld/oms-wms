import prisma from './prisma';
import { generateHourlyReports } from './reportGenerator.service';

let reportCronInterval: NodeJS.Timeout | null = null;

async function runReportCron(): Promise<void> {
  const startedAt = Date.now();
  console.log('[report-cron] starting run');

  const activeTenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  for (const tenant of activeTenants) {
    try {
      await generateHourlyReports(tenant.id);
      console.log(`[report-cron] tenant=${tenant.name} done`);
    } catch (err) {
      console.error(`[report-cron] tenant=${tenant.name} error:`, err);
    }
  }

  console.log(`[report-cron] completed ${activeTenants.length} tenants in ${Date.now() - startedAt}ms`);
}

export function startReportCron(intervalMs: number = 60 * 60 * 1000) {
  if (reportCronInterval) return;
  if (process.env.REPORT_CRON_DISABLED === 'true') {
    console.log('[report-cron] disabled via env');
    return;
  }
  console.log(`[report-cron] starting (interval ${intervalMs}ms)`);
  reportCronInterval = setInterval(() => {
    runReportCron().catch(err => console.error('[report-cron] unhandled:', err));
  }, intervalMs);
  if ((reportCronInterval as any).unref) (reportCronInterval as any).unref();

  // Initial run after 30s delay (staggered from SLA cron)
  setTimeout(() => {
    runReportCron().catch(err => console.error('[report-cron] initial run error:', err));
  }, 30 * 1000);
}

export function stopReportCron() {
  if (reportCronInterval) {
    clearInterval(reportCronInterval);
    reportCronInterval = null;
  }
}
