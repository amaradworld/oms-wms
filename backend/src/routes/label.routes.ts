import { Router } from 'express';
import { generateZplLabel } from '../controllers/label.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/zpl', authenticate, generateZplLabel);

export default router;
