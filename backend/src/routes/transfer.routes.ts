import { Router } from 'express';
import { getTransfers, createTransfer, completeTransfer } from '../controllers/transfer.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getTransfers);
router.post('/', authenticate, createTransfer);
router.put('/:id/complete', authenticate, completeTransfer);

export default router;
