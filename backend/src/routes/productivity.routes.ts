import { Router } from 'express';
import { getProductivityStats, logActivity, getPickerProductivity } from '../controllers/productivity.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getProductivityStats);
router.get('/picker', authenticate, getPickerProductivity);
router.post('/log', authenticate, tenantScope, logActivity);
export default router;
