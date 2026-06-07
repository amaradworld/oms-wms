import { Router } from 'express';
import { getBins, createBin, createBulkBins, deleteBin } from '../controllers/bin.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getBins);
router.post('/', authenticate, tenantScope, createBin);
router.post('/bulk', authenticate, tenantScope, createBulkBins);
router.delete('/:id', authenticate, tenantScope, deleteBin);

export default router;
