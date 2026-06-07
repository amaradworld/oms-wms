import { Router } from 'express';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';
import {
  getGatepasses,
  getGatepassById,
  createGatepass,
  createGatepassFromStockTransfer,
  updateGatepassStatus,
  scanGatepassItem,
} from '../controllers/gatepass.controller';

const router = Router();

router.get('/', authenticate, getGatepasses);
router.get('/:id', authenticate, getGatepassById);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createGatepass);
router.post('/from-stock-transfer/:id', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createGatepassFromStockTransfer);
router.patch('/:id/status', authenticate, tenantScope, updateGatepassStatus);
router.post('/:id/scan', authenticate, tenantScope, scanGatepassItem);

export default router;
