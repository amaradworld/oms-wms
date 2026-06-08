import { Router } from 'express';
import { healthDb, streamBackup, runBackup } from '../controllers/backup.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, streamBackup);
router.post('/s3', runBackup);
router.get('/health/db', authenticate, healthDb);

export default router;
