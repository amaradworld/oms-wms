import { Router } from 'express';
import { getBins, createBin, createBulkBins, deleteBin } from '../controllers/bin.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getBins);
router.post('/', authenticate, createBin);
router.post('/bulk', authenticate, createBulkBins);
router.delete('/:id', authenticate, deleteBin);

export default router;
