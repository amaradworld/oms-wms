import { Router } from 'express';
import { importOrders, importInventory, importReturns, importParties, upload } from '../controllers/import.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.post('/orders', authenticate, tenantScope, upload.single('file'), importOrders);
router.post('/inventory', authenticate, tenantScope, upload.single('file'), importInventory);
router.post('/returns', authenticate, tenantScope, upload.single('file'), importReturns);
router.post('/suppliers', authenticate, tenantScope, upload.single('file'), importParties);

export default router;
