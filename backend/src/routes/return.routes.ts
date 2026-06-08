import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getReturns, createReturn, updateReturnStatus, deleteReturn } from '../controllers/return.controller';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), getReturns);
router.post('/', authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createReturn);
router.patch('/:id/status', authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), updateReturnStatus);
router.delete('/:id', authorize(['SUPER_ADMIN']), deleteReturn);

export default router;
