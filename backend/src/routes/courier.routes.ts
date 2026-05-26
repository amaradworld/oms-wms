import { Router } from 'express';
import { generateAWB } from '../controllers/courier.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.post('/generate-awb', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), generateAWB);

export default router;
