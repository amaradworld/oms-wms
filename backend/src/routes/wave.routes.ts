import { Router } from 'express';
import { getWaves, createWave, getWaveOrders, startWave, scanWaveItem, completeWave, confirmWaveOrder } from '../controllers/wave.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getWaves);
router.post('/', authenticate, createWave);
router.get('/:id/orders', authenticate, getWaveOrders);
router.put('/:id/start', authenticate, startWave);
router.put('/:id/complete', authenticate, completeWave);
router.post('/:id/scan-item', authenticate, scanWaveItem);
router.post('/:id/confirm-order', authenticate, confirmWaveOrder);

export default router;
