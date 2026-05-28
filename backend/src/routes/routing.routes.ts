import { Router } from 'express';
import {
  getRoutingConfigs,
  upsertRoutingConfig,
  deleteRoutingConfig,
  suggestCourier,
} from '../controllers/routing.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getRoutingConfigs);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), upsertRoutingConfig);
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), deleteRoutingConfig);
router.post('/suggest', authenticate, suggestCourier);

export default router;
