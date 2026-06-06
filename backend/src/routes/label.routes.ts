import { Router } from 'express';
import { generateSkuLabel, generateShippingLabel } from '../controllers/label.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/generate', authenticate, generateSkuLabel);
router.post('/generate-shipping', authenticate, generateShippingLabel);

export default router;
