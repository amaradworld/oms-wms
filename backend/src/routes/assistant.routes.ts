import { Router } from 'express';
import { askAssistant } from '../controllers/assistant.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.post('/ask', authenticate, tenantScope, askAssistant);

export default router;
