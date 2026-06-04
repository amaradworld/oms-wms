import { Router } from 'express';
import { healthDb, streamBackup, backupToS3 } from '../controllers/backup.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', streamBackup);
router.post('/s3', backupToS3);
router.get('/health/db', authenticate, healthDb);

export default router;
