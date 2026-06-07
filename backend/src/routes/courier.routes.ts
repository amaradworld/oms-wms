import { Router } from 'express';
import { generateAWB } from '../controllers/courier.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.post('/generate-awb', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), generateAWB);

export default router;
