import { Router } from 'express';
import { importOrders, importInventory, importReturns, upload } from '../controllers/import.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/orders/import', authenticate, upload.single('file'), importOrders);
router.post('/inventory/import', authenticate, upload.single('file'), importInventory);
router.post('/returns/import', authenticate, upload.single('file'), importReturns);

export default router;
