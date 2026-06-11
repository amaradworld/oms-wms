import { Router } from 'express';
import { createLead, getLeads, updateLead } from '../controllers/lead.controller';
import { sendDailyDigest } from '../services/leadEmail.service';
import { authenticate, authorize, requirePlatformOwner } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLeadSchema } from '../middlewares/validation';

const router = Router();

// Public endpoint: no auth required
router.post('/', validate(createLeadSchema), createLead);

// Platform owner only: read and update leads
router.use(authenticate, requirePlatformOwner);
router.get('/', getLeads);
router.put('/:id', updateLead);
router.post('/digest', sendDailyDigest);

export default router;
