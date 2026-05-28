import { Router } from 'express';
import { getIntegrations, getIntegration, createIntegration, updateIntegration, deleteIntegration, triggerSync } from '../controllers/integration.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getIntegrations);
router.get('/:id', authenticate, getIntegration);
router.post('/', authenticate, createIntegration);
router.put('/:id', authenticate, updateIntegration);
router.delete('/:id', authenticate, deleteIntegration);
router.post('/:id/sync', authenticate, triggerSync);

export default router;
