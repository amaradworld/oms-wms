import { Router } from 'express';
import { getWaves, createWave, getWaveOrders, startWave, scanWaveItem, completeWave, confirmWaveOrder } from '../controllers/wave.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getWaves);
router.post('/', authenticate, tenantScope, createWave);
router.get('/:id/orders', authenticate, getWaveOrders);
router.put('/:id/start', authenticate, tenantScope, startWave);
router.put('/:id/complete', authenticate, tenantScope, completeWave);
router.post('/:id/scan-item', authenticate, tenantScope, scanWaveItem);
router.post('/:id/confirm-order', authenticate, tenantScope, confirmWaveOrder);

export default router;
