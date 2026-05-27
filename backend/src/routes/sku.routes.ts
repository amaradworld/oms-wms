import { Router } from 'express';
import { getSkus, createSku } from '../controllers/sku.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSkuSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getSkus);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createSkuSchema), createSku);

export default router;
