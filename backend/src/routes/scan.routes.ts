import { Router } from 'express';
import { verifyScan } from '../controllers/scan.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { scanVerifySchema } from '../schemas';

const router = Router();

router.post('/verify', authenticate, validate(scanVerifySchema), verifyScan);

export default router;
