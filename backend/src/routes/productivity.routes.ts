import { Router } from 'express';
import { getProductivityStats, logActivity } from '../controllers/productivity.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getProductivityStats);
router.post('/log', authenticate, tenantScope, logActivity);
export default router;
