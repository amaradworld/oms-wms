import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import scanRoutes from './routes/scan.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import skuRoutes from './routes/sku.routes';
import inventoryRoutes from './routes/inventory.routes';
import picklistRoutes from './routes/picklist.routes';
import warehouseRoutes from './routes/warehouse.routes';
import courierRoutes from './routes/courier.routes';
import invoiceRoutes from './routes/invoice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import importRoutes from './routes/import.routes';
import userRoutes from './routes/user.routes';
import auditRoutes from './routes/audit.routes';
import exportRoutes from './routes/export.routes';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'https://globalsupply.in',
    'https://www.globalsupply.in',
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
app.use('/api', importRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
