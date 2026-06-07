import { Router } from 'express';
import { getIntegrations, getIntegration, createIntegration, updateIntegration, deleteIntegration, triggerSync } from '../controllers/integration.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getIntegrations);
router.get('/:id', authenticate, getIntegration);
router.post('/', authenticate, tenantScope, createIntegration);
router.put('/:id', authenticate, tenantScope, updateIntegration);
router.delete('/:id', authenticate, tenantScope, deleteIntegration);
router.post('/:id/sync', authenticate, tenantScope, triggerSync);

export default router;
