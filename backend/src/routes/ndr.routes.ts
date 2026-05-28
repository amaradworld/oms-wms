import { Router } from 'express';
import {
  getNdrCases,
  getNdrStats,
  createNdrCase,
  scheduleReattempt,
  resolveNdrCase,
} from '../controllers/ndr.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getNdrCases);
router.get('/stats', authenticate, getNdrStats);
router.post('/', authenticate, createNdrCase);
router.patch('/:id/reattempt', authenticate, scheduleReattempt);
router.patch('/:id/resolve', authenticate, resolveNdrCase);

export default router;
