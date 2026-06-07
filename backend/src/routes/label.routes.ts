import { Router } from 'express';
import { generateSkuLabel, generateShippingLabel } from '../controllers/label.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.post('/generate', authenticate, tenantScope, generateSkuLabel);
router.post('/generate-shipping', authenticate, tenantScope, generateShippingLabel);

export default router;
