import { Router } from 'express';
import { getDashboardStats, getDashboardDetails } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getDashboardStats);
router.get('/stats', authenticate, getDashboardStats);
router.get('/details', authenticate, getDashboardDetails);

export default router;
