import { Router } from 'express';
import {
  listCycleCounts,
  getCycleCount,
  createCycleCount,
  updateCountItem,
  completeCycleCount,
  cancelCycleCount,
} from '../controllers/cyclecount.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, listCycleCounts);
router.get('/:id', authenticate, getCycleCount);
router.post('/', authenticate, tenantScope, createCycleCount);
router.put('/item', authenticate, tenantScope, updateCountItem);
router.put('/:id/complete', authenticate, tenantScope, completeCycleCount);
router.put('/:id/cancel', authenticate, tenantScope, cancelCycleCount);

export default router;
