import { Router } from 'express';
import { getReplenishmentTasks, createReplenishmentTask, completeReplenishmentTask, cancelReplenishmentTask, generateFromAlerts } from '../controllers/replenishment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getReplenishmentTasks);
router.post('/', authenticate, createReplenishmentTask);
router.post('/generate', authenticate, generateFromAlerts);
router.put('/:id/complete', authenticate, completeReplenishmentTask);
router.put('/:id/cancel', authenticate, cancelReplenishmentTask);
export default router;
