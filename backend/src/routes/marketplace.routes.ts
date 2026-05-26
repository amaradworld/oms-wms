import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  listConnectors, getConfigs, saveConfig, deleteConfig,
  syncOrders, getSyncStatus,
} from '../controllers/marketplace.controller';

const router = Router();

router.get('/connectors', authenticate, listConnectors);
router.get('/configs', authenticate, getConfigs);
router.post('/configs', authenticate, authorize(['SUPER_ADMIN']), saveConfig);
router.delete('/configs/:marketplace', authenticate, authorize(['SUPER_ADMIN']), deleteConfig);
router.post('/sync/:marketplace', authenticate, authorize(['SUPER_ADMIN']), syncOrders);
router.get('/sync/:marketplace/status', authenticate, getSyncStatus);

export default router;
