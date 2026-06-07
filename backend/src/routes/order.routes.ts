import { Router } from 'express';
import { getOrders, createOrder, updateOrderStatus, updateOrder, splitOrder, cancelOrder, getOrderSlaSummary } from '../controllers/order.controller';
import { authenticate, authorize, tenantScope } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas';

const router = Router();

router.get('/sla-summary', authenticate, getOrderSlaSummary);
router.get('/', authenticate, getOrders);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createOrderSchema), createOrder);
router.patch('/:id/status', authenticate, tenantScope, validate(updateOrderStatusSchema), updateOrderStatus);
router.patch('/:id', authenticate, tenantScope, updateOrder);
router.post('/:id/cancel', authenticate, tenantScope, cancelOrder);
router.post('/:id/split', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), splitOrder);

export default router;
