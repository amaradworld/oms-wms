import { Router } from 'express';
import { generateLabel } from '../controllers/label.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/generate', authenticate, generateLabel);

export default router;
