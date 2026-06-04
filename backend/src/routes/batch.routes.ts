import { Router } from 'express';
import { searchBatches, traceBatch } from '../controllers/batch.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, searchBatches);
router.get('/trace/:batchNo', authenticate, traceBatch);
export default router;
