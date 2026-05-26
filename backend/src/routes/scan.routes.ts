import { Router } from 'express';
import { verifyScan } from '../controllers/scan.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/verify', authenticate, verifyScan);

export default router;
