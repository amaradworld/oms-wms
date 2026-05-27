import { Router } from 'express';
import { exportOrders, exportInventory } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/orders', authenticate, exportOrders);
router.get('/inventory', authenticate, exportInventory);

export default router;
