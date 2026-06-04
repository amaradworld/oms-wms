import { Router } from 'express';
import { importOrders, importInventory, importReturns, importParties, upload } from '../controllers/import.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/orders', authenticate, upload.single('file'), importOrders);
router.post('/inventory', authenticate, upload.single('file'), importInventory);
router.post('/returns', authenticate, upload.single('file'), importReturns);
router.post('/suppliers', authenticate, upload.single('file'), importParties);

export default router;
