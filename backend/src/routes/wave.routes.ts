import { Router } from 'express';
import { getWaves, createWave, getWaveOrders, completeWave } from '../controllers/wave.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getWaves);
router.post('/', authenticate, createWave);
router.get('/:id/orders', authenticate, getWaveOrders);
router.put('/:id/complete', authenticate, completeWave);

export default router;
