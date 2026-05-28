import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
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
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createGatepass);
router.post('/from-stock-transfer/:id', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createGatepassFromStockTransfer);
router.patch('/:id/status', authenticate, updateGatepassStatus);
router.post('/:id/scan', authenticate, scanGatepassItem);

export default router;
