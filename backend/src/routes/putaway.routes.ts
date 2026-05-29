import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getPutawaySources,
  createPutawayTask,
  getPutawayTasks,
  assignBinToTask,
  completePutaway,
} from '../controllers/putaway.controller';

const router = Router();

router.get('/putaway/sources', authenticate, getPutawaySources);
router.post('/putaway/task', authenticate, createPutawayTask);
router.get('/putaway', authenticate, getPutawayTasks);
router.put('/putaway/:id/assign-bin', authenticate, assignBinToTask);
router.put('/putaway/:id/complete', authenticate, completePutaway);

export default router;
