import { Router } from 'express';
import { generateInvoice } from '../controllers/invoice.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:orderId/pdf', authenticate, generateInvoice);

export default router;
