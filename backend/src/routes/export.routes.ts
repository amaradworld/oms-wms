import { Router } from 'express';
import { exportOrders, exportInventory, exportInventoryAdded, exportStockTransfers, exportReturns, exportPurchaseOrders, exportCycleCounts, exportPickWaves, exportAuditLogs } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/orders', authenticate, exportOrders);
router.get('/inventory', authenticate, exportInventory);
router.get('/inventory-added', authenticate, exportInventoryAdded);
router.get('/stock-transfers', authenticate, exportStockTransfers);
router.get('/returns', authenticate, exportReturns);
router.get('/purchase-orders', authenticate, exportPurchaseOrders);
router.get('/cycle-counts', authenticate, exportCycleCounts);
router.get('/pick-waves', authenticate, exportPickWaves);
router.get('/audit-logs', authenticate, exportAuditLogs);

export default router;
