import { Router } from 'express';
import { healthDb, streamBackup, backupToS3 } from '../controllers/backup.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/backup', streamBackup);
router.post('/backup/s3', backupToS3);
router.get('/health/db', authenticate, healthDb);

export default router;
