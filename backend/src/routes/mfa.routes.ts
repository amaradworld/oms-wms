import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { mfaSetup, mfaVerify, mfaDisable, mfaStatus, mfaChallenge } from '../controllers/mfa.controller';

const router = Router();

router.get('/status', authenticate, mfaStatus);
router.post('/setup', authenticate, mfaSetup);
router.post('/verify', authenticate, mfaVerify);
router.post('/disable', authenticate, mfaDisable);
router.post('/challenge', authenticate, mfaChallenge);

export default router;
