import { Router } from 'express';
import {
  getNdrCases,
  getNdrStats,
  createNdrCase,
  scheduleReattempt,
  resolveNdrCase,
} from '../controllers/ndr.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getNdrCases);
router.get('/stats', authenticate, getNdrStats);
router.post('/', authenticate, tenantScope, createNdrCase);
router.patch('/:id/reattempt', authenticate, tenantScope, scheduleReattempt);
router.patch('/:id/resolve', authenticate, tenantScope, resolveNdrCase);

export default router;
