import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, getReorderAlerts, updateReorderPoint } from '../controllers/purchase.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/suppliers', authenticate, getSuppliers);
router.post('/suppliers', authenticate, tenantScope, createSupplier);
router.put('/suppliers/:id', authenticate, tenantScope, updateSupplier);
router.get('/orders', authenticate, getPurchaseOrders);
router.post('/orders', authenticate, tenantScope, createPurchaseOrder);
router.put('/orders/:id/receive', authenticate, tenantScope, receivePurchaseOrder);
router.get('/reorder-alerts', authenticate, getReorderAlerts);
router.put('/reorder-point', authenticate, tenantScope, updateReorderPoint);

export default router;
