import { Router } from 'express';
import { getPicklists, createPicklist, assignPicker } from '../controllers/picklist.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPicklistSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getPicklists);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), validate(createPicklistSchema), createPicklist);
router.patch('/:id/assign', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), assignPicker);

export default router;
