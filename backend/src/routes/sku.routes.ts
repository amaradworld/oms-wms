import { Router } from 'express';
import { getSkus, getSkuHistory, createSku, updateSku, deleteSku, bulkImportSkus } from '../controllers/sku.controller';
import { authenticate, authorize, tenantScope } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSkuSchema, updateSkuSchema } from '../schemas';
import { upload } from '../controllers/import.controller';

const router = Router();

router.get('/', authenticate, getSkus);
router.get('/:skuCode/history', authenticate, getSkuHistory);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createSkuSchema), createSku);
router.put('/:id', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(updateSkuSchema), updateSku);
router.delete('/:id', authenticate, tenantScope, authorize(['SUPER_ADMIN']), deleteSku);
router.post('/import', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), upload.single('file'), bulkImportSkus);

export default router;
