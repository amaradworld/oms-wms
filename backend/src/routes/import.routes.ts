import { Router } from 'express';
import { importOrders, importInventory, importReturns } from '../controllers/import.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/orders/import', authenticate, importOrders);
router.post('/inventory/import', authenticate, importInventory);
router.post('/returns/import', authenticate, importReturns);

export default router;
