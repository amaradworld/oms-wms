import { Router } from 'express';
import { getBins, createBin, createBulkBins, deleteBin } from '../controllers/bin.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/bins', authenticate, getBins);
router.post('/bins', authenticate, createBin);
router.post('/bins/bulk', authenticate, createBulkBins);
router.delete('/bins/:id', authenticate, deleteBin);

export default router;
