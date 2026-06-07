import { Router } from 'express';
import {
  getNdrCases,
  getNdrStats,
  getNdrResponseRate,
  createNdrCase,
  scheduleReattempt,
  resolveNdrCase,
  closeNdrCase,
} from '../controllers/ndr.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getNdrCases);
router.get('/stats', authenticate, getNdrStats);
router.get('/response-rate', authenticate, getNdrResponseRate);
router.post('/', authenticate, tenantScope, createNdrCase);
router.patch('/:id/reattempt', authenticate, tenantScope, scheduleReattempt);
router.patch('/:id/resolve', authenticate, tenantScope, resolveNdrCase);
router.patch('/:id/close', authenticate, tenantScope, closeNdrCase);

export default router;
