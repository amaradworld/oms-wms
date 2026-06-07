import { Router } from 'express';
import { getSkus, getSkuHistory, createSku } from '../controllers/sku.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSkuSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getSkus);
router.get('/:skuCode/history', authenticate, getSkuHistory);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createSkuSchema), createSku);

export default router;
