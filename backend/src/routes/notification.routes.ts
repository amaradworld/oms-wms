import { Router } from 'express';
import { triggerAlerts, getNotificationLog, getPreferences, updatePreferences } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.post('/trigger', authenticate, triggerAlerts);
router.get('/log', authenticate, getNotificationLog);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, updatePreferences);
export default router;
