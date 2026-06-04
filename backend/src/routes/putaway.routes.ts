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

router.get('/sources', authenticate, getPutawaySources);
router.post('/task', authenticate, createPutawayTask);
router.get('/', authenticate, getPutawayTasks);
router.put('/:id/assign-bin', authenticate, assignBinToTask);
router.put('/:id/complete', authenticate, completePutaway);

export default router;
