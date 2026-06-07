import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import prisma from './services/prisma';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import scanRoutes from './routes/scan.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import skuRoutes from './routes/sku.routes';
import { globalSearch } from './controllers/search.controller';
import { authenticate } from './middlewares/auth.middleware';
import inventoryRoutes from './routes/inventory.routes';
import picklistRoutes from './routes/picklist.routes';
import warehouseRoutes from './routes/warehouse.routes';
import courierRoutes from './routes/courier.routes';
import invoiceRoutes from './routes/invoice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import cycleCountRoutes from './routes/cyclecount.routes';
import purchaseRoutes from './routes/purchase.routes';
import transferRoutes from './routes/transfer.routes';
import labelRoutes from './routes/label.routes';
import importRoutes from './routes/import.routes';
import waveRoutes from './routes/wave.routes';
import trackRoutes from './routes/track.routes';
import userRoutes from './routes/user.routes';
import auditRoutes from './routes/audit.routes';
import exportRoutes from './routes/export.routes';
import deliveryRoutes from './routes/delivery.routes';
import manifestRoutes from './routes/manifest.routes';
import ndrRoutes from './routes/ndr.routes';
import routingRoutes from './routes/routing.routes';
import backupRoutes from './routes/backup.routes';
import gatepassRoutes from './routes/gatepass.routes';
import integrationRoutes from './routes/integration.routes';
import grnRoutes from './routes/grn.routes';
import binRoutes from './routes/bin.routes';
import putawayRoutes from './routes/putaway.routes';
import assistantRoutes from './routes/assistant.routes';
import dataRoutes from './routes/data.routes';
import expiryRoutes from './routes/expiry.routes';
import replenishmentRoutes from './routes/replenishment.routes';
import productivityRoutes from './routes/productivity.routes';
import asnRoutes from './routes/asn.routes';
import notificationRoutes from './routes/notification.routes';
import batchRoutes from './routes/batch.routes';
import mfaRoutes from './routes/mfa.routes';
import tenantRoutes from './routes/tenant.routes';
import { errorHandler } from './middlewares/error.middleware';
import { httpsRedirect } from './middlewares/https.middleware';
import { ensureDefaults } from './ensureDefaults';

dotenv.config();

const app = express();

app.use(helmet());
app.use(httpsRedirect);
app.use(cors({
  origin: [
    'https://globalsupply.in',
    'https://www.globalsupply.in',
    'https://app.globalsupply.in',
    'https://oms-wms-phi.vercel.app',
    'https://oms-wms-git-main-amaradworlds-projects.vercel.app',
    'http://localhost:3000',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { message: 'Too many requests' } }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/picklists', picklistRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cycle-counts', cycleCountRoutes);
app.use('/api/import', importRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/waves', waveRoutes);
app.use('/api/tracking', trackRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/manifests', manifestRoutes);
app.use('/api/ndr', ndrRoutes);
app.use('/api/courier/routing', routingRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/gatepass', gatepassRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/putaway', putawayRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/auth/mfa', mfaRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/replenishment', replenishmentRoutes);
app.use('/api/productivity', productivityRoutes);
app.use('/api/asn', asnRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/search', authenticate, globalSearch);

app.post('/api/client-errors', (req, res) => {
  console.error('[client-error]', JSON.stringify(req.body).slice(0, 2000));
  res.status(204).end();
});

app.get('/health', async (req, res) => {
  let db = 'unknown';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    db = 'connected';
  } catch { db = 'disconnected'; }
  res.json({ status: 'UP', db, timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
ensureDefaults().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
