import { Router } from 'express';
import { getGrns, getGrnDetail, createGrn, qcGrnItem, approveGrn, rejectGrn } from '../controllers/grn.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getGrns);
router.get('/:id', authenticate, getGrnDetail);
router.post('/', authenticate, createGrn);
router.post('/:id/qc', authenticate, qcGrnItem);
router.post('/:id/approve', authenticate, approveGrn);
router.post('/:id/reject', authenticate, rejectGrn);

export default router;
