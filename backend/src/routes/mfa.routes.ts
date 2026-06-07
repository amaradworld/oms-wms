import { Router } from 'express';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';
import { mfaSetup, mfaVerify, mfaDisable, mfaStatus, mfaChallenge } from '../controllers/mfa.controller';

const router = Router();

router.get('/status', authenticate, mfaStatus);
router.post('/setup', authenticate, tenantScope, mfaSetup);
router.post('/verify', authenticate, tenantScope, mfaVerify);
router.post('/disable', authenticate, tenantScope, mfaDisable);
router.post('/challenge', authenticate, tenantScope, mfaChallenge);

export default router;
