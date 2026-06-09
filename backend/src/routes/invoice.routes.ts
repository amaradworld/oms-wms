import { Router } from 'express';
import {
  createInvoice, getInvoices, getInvoiceById, requestEinvoice,
  generateCreditNote, cancelInvoice, setEwayBill, generateInvoicePdf,
} from '../controllers/invoice.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getInvoices);
router.post('/', authenticate, tenantScope, createInvoice);
router.get('/:id', authenticate, getInvoiceById);
router.post('/:id/einvoice', authenticate, tenantScope, requestEinvoice);
router.post('/:id/credit-note', authenticate, tenantScope, generateCreditNote);
router.patch('/:id/cancel', authenticate, tenantScope, cancelInvoice);
router.get('/pdf/:orderId', authenticate, generateInvoicePdf);
router.patch('/:orderId/eway-bill', authenticate, tenantScope, setEwayBill);

export default router;
