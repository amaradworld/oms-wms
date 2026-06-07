import { Router } from 'express';
import { getAsns, getAsnDetail, createAsn, updateAsnStatus } from '../controllers/asn.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getAsns);
router.get('/:id', authenticate, getAsnDetail);
router.post('/', authenticate, tenantScope, createAsn);
router.put('/:id/status', authenticate, tenantScope, updateAsnStatus);
export default router;
