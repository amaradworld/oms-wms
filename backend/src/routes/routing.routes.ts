import { Router } from 'express';
import {
  getRoutingConfigs,
  upsertRoutingConfig,
  deleteRoutingConfig,
  suggestCourier,
} from '../controllers/routing.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getRoutingConfigs);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), upsertRoutingConfig);
router.delete('/:id', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), deleteRoutingConfig);
router.post('/suggest', authenticate, tenantScope, suggestCourier);

export default router;
