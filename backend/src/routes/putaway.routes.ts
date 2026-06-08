import { Router } from 'express';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';
import {
  getPutawaySources,
  createPutawayTask,
  getPutawayTasks,
  assignBinToTask,
  completePutaway,
  suggestBin,
} from '../controllers/putaway.controller';

const router = Router();

router.get('/sources', authenticate, getPutawaySources);
router.get('/suggest-bin', authenticate, suggestBin);
router.post('/task', authenticate, tenantScope, createPutawayTask);
router.get('/', authenticate, getPutawayTasks);
router.put('/:id/assign-bin', authenticate, tenantScope, assignBinToTask);
router.put('/:id/complete', authenticate, tenantScope, completePutaway);

export default router;
