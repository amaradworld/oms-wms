import { Router } from 'express';
import { getGrns, getGrnDetail, createGrn, qcGrnItem, approveGrn, rejectGrn, scanReceiveGrnItem } from '../controllers/grn.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getGrns);
router.get('/:id', authenticate, getGrnDetail);
router.post('/', authenticate, tenantScope, createGrn);
router.post('/:id/qc', authenticate, tenantScope, qcGrnItem);
router.post('/:id/scan-receive', authenticate, tenantScope, scanReceiveGrnItem);
router.post('/:id/approve', authenticate, tenantScope, approveGrn);
router.post('/:id/reject', authenticate, tenantScope, rejectGrn);

export default router;
