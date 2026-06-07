import { Router } from 'express';
import { triggerAlerts, getNotificationLog, getPreferences, updatePreferences } from '../controllers/notification.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();
router.post('/trigger', authenticate, tenantScope, triggerAlerts);
router.get('/log', authenticate, getNotificationLog);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, tenantScope, updatePreferences);
export default router;
