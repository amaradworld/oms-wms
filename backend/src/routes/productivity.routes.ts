import { Router } from 'express';
import { getProductivityStats, logActivity } from '../controllers/productivity.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getProductivityStats);
router.post('/log', authenticate, logActivity);
export default router;
