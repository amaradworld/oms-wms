import { Router } from 'express';
import { getExpiringStock, getGrnExpiryTracking } from '../controllers/expiry.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.get('/stock', authenticate, getExpiringStock);
router.get('/grn', authenticate, getGrnExpiryTracking);
export default router;
