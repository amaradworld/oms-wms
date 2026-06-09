import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../services/prisma';

const router = Router();

router.get('/reports', authenticate, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenant_id;
    const { type, from, to } = req.query;

    const where: any = { tenantId };
    if (type) where.reportType = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string + 'T23:59:59.999Z');
    }

    const reports = await prisma.report.findMany({
      where,
      select: {
        id: true,
        reportType: true,
        period: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { period: 'desc' },
      take: 500,
    });

    const grouped: Record<string, Record<string, any[]>> = {};
    for (const r of reports) {
      const dateKey = r.period.toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][r.reportType]) grouped[dateKey][r.reportType] = [];
      grouped[dateKey][r.reportType].push(r);
    }

    res.json(grouped);
  } catch (err) {
    console.error('[ftp] list error:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

router.get('/reports/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenant_id;
    const reportId = req.params.id as string;
    const report = await prisma.report.findFirst({
      where: { id: reportId, tenantId },
    });
    if (!report) return res.status(404).json({ message: 'Report not found' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    res.send(Buffer.from(report.fileData));
  } catch (err) {
    console.error('[ftp] download error:', err);
    res.status(500).json({ message: 'Failed to download report' });
  }
});

router.get('/reports/:id/preview', authenticate, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenant_id;
    const reportId = req.params.id as string;
    const report = await prisma.report.findFirst({
      where: { id: reportId, tenantId },
    });
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const csv = Buffer.from(report.fileData).toString('utf-8');
    const lines = csv.split('\n');
    const preview = lines.slice(0, 101).join('\n');
    const totalRows = Math.max(0, lines.length - 1);

    res.json({
      fileName: report.fileName,
      reportType: report.reportType,
      period: report.period,
      totalRows,
      preview,
    });
  } catch (err) {
    console.error('[ftp] preview error:', err);
    res.status(500).json({ message: 'Failed to preview report' });
  }
});

router.post('/reports/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { generateHourlyReports } = await import('../services/reportGenerator.service');
    await generateHourlyReports(req.user!.tenant_id);
    res.json({ message: 'Reports generated successfully' });
  } catch (err) {
    console.error('[ftp] generate error:', err);
    res.status(500).json({ message: 'Failed to generate reports' });
  }
});

export default router;
