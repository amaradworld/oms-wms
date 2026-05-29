import { Router } from 'express';
import { getGrns, getGrnDetail, createGrn, qcGrnItem, approveGrn, rejectGrn, getPutawayTasks, assignBinToTask, completePutaway } from '../controllers/grn.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/grn', authenticate, getGrns);
router.get('/grn/:id', authenticate, getGrnDetail);
router.post('/grn', authenticate, createGrn);
router.post('/grn/:id/qc', authenticate, qcGrnItem);
router.post('/grn/:id/approve', authenticate, approveGrn);
router.post('/grn/:id/reject', authenticate, rejectGrn);

router.get('/putaway', authenticate, getPutawayTasks);
router.put('/putaway/:id/assign-bin', authenticate, assignBinToTask);
router.put('/putaway/:id/complete', authenticate, completePutaway);

export default router;
