import { Router } from 'express';
import { checkDeliveries, markDelivered, getShippedOrders } from '../controllers/delivery.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/check', checkDeliveries);
router.get('/shipped', authenticate, getShippedOrders);
router.patch('/orders/:id/deliver', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), markDelivered);

export default router;
