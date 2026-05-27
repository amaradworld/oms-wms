import { Router } from 'express';
import {
  listCycleCounts,
  getCycleCount,
  createCycleCount,
  updateCountItem,
  completeCycleCount,
  cancelCycleCount,
} from '../controllers/cyclecount.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, listCycleCounts);
router.get('/:id', authenticate, getCycleCount);
router.post('/', authenticate, createCycleCount);
router.put('/item', authenticate, updateCountItem);
router.put('/:id/complete', authenticate, completeCycleCount);
router.put('/:id/cancel', authenticate, cancelCycleCount);

export default router;
