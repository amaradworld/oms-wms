import { Router } from 'express';
import { createLead, getLeads, updateLead } from '../controllers/lead.controller';
import { authenticate, authorize, requirePlatformOwner } from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint: no auth required
router.post('/', createLead);

// Platform owner only: read and update leads
router.use(authenticate, requirePlatformOwner);
router.get('/', getLeads);
router.put('/:id', updateLead);

export default router;
