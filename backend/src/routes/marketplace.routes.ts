import { Router } from 'express';
import { syncMarketplaceOrders } from '../controllers/marketplace.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.post('/sync', authenticate, authorize(['SUPER_ADMIN']), syncMarketplaceOrders);

export default router;
