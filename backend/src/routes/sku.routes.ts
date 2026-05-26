import { Router } from 'express';
import { getSkus, createSku } from '../controllers/sku.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getSkus);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createSku);

export default router;
