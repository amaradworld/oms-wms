import { Router } from 'express';
import { askAssistant } from '../controllers/assistant.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/ask', authenticate, askAssistant);

export default router;
