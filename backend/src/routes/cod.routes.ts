import { Router } from 'express';
import { getCodSettlements, importCodSettlement, reconcileCodSettlement, getCodSummary } from '../controllers/cod.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getCodSettlements);
router.get('/summary', authenticate, getCodSummary);
router.post('/import', authenticate, tenantScope, importCodSettlement);
router.patch('/:id/reconcile', authenticate, tenantScope, reconcileCodSettlement);

export default router;
