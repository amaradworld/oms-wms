import { Router } from 'express';
import { handleWebhook } from '../controllers/webhook.controller';
import { verifyWebhookSignature } from '../middlewares/webhookAuth.middleware';

const router = Router();

router.post('/:marketplace', verifyWebhookSignature, handleWebhook);

export default router;
