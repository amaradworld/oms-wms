import { Router } from 'express';
import { triggerAlerts, triggerSlaCron, getNotificationLog, getPreferences, updatePreferences } from '../controllers/notification.controller';
import { authenticate, tenantScope } from '../middlewares/auth.middleware';

const router = Router();
router.post('/trigger', authenticate, tenantScope, triggerAlerts);
router.post('/sla-cron', authenticate, tenantScope, triggerSlaCron);
router.get('/log', authenticate, getNotificationLog);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, tenantScope, updatePreferences);
export default router;
