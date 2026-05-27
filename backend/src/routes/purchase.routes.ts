import { Router } from 'express';
import { getSuppliers, createSupplier, getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, getReorderAlerts, updateReorderPoint } from '../controllers/purchase.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/suppliers', authenticate, getSuppliers);
router.post('/suppliers', authenticate, createSupplier);
router.get('/purchase-orders', authenticate, getPurchaseOrders);
router.post('/purchase-orders', authenticate, createPurchaseOrder);
router.put('/purchase-orders/:id/receive', authenticate, receivePurchaseOrder);
router.get('/reorder-alerts', authenticate, getReorderAlerts);
router.put('/reorder-point', authenticate, updateReorderPoint);

export default router;
