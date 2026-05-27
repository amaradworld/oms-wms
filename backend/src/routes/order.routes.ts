import { Router } from 'express';
import { getOrders, createOrder, updateOrderStatus, cancelOrder } from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getOrders);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createOrderSchema), createOrder);
router.patch('/:id/status', authenticate, validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/:id/cancel', authenticate, cancelOrder);

export default router;
