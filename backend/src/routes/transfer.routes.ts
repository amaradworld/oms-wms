import { Router } from 'express';
import { getTransfers, getTransfer, createTransfer, scanTransferItem, completeTransfer } from '../controllers/transfer.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getTransfers);
router.get('/:id', authenticate, getTransfer);
router.post('/', authenticate, createTransfer);
router.put('/:id/scan-item', authenticate, scanTransferItem);
router.put('/:id/complete', authenticate, completeTransfer);

export default router;
