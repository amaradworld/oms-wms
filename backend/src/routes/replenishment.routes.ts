import { Router } from 'express';
import { getReplenishmentTasks, createReplenishmentTask, assignReplenishmentTask, completeReplenishmentTask, cancelReplenishmentTask, generateFromAlerts } from '../controllers/replenishment.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getReplenishmentTasks);
router.post('/', authenticate, tenantScope, createReplenishmentTask);
router.post('/generate', authenticate, tenantScope, generateFromAlerts);
router.put('/:id/assign', authenticate, tenantScope, assignReplenishmentTask);
router.put('/:id/complete', authenticate, tenantScope, completeReplenishmentTask);
router.put('/:id/cancel', authenticate, tenantScope, cancelReplenishmentTask);
export default router;
