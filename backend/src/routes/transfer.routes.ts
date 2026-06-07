import { Router } from 'express';
import { getTransfers, getTransfer, createTransfer, scanTransferItem, completeTransfer, printTransfer } from '../controllers/transfer.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getTransfers);
router.get('/:id', authenticate, getTransfer);
router.get('/:id/print', authenticate, printTransfer);
router.post('/', authenticate, tenantScope, createTransfer);
router.put('/:id/scan-item', authenticate, tenantScope, scanTransferItem);
router.put('/:id/complete', authenticate, tenantScope, completeTransfer);

export default router;
