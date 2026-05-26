import { Router } from 'express';
import { getPicklists, createPicklist, assignPicker } from '../controllers/picklist.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getPicklists);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createPicklist);
router.patch('/:id/assign', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), assignPicker);

export default router;
