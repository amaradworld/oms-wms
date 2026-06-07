import { Router } from 'express';
import { generateInvoice, setEwayBill } from '../controllers/invoice.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/:orderId/pdf', authenticate, generateInvoice);
router.patch('/:orderId/eway-bill', authenticate, tenantScope, setEwayBill);

export default router;
