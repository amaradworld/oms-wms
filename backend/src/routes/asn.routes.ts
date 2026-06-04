import { Router } from 'express';
import { getAsns, getAsnDetail, createAsn, updateAsnStatus } from '../controllers/asn.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.get('/', authenticate, getAsns);
router.get('/:id', authenticate, getAsnDetail);
router.post('/', authenticate, createAsn);
router.put('/:id/status', authenticate, updateAsnStatus);
export default router;
