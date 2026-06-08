import { Router } from 'express';
import { authenticate, requirePlatformOwner } from '../middlewares/auth.middleware';
import {
  listBackups,
  runBackup,
  restoreBackup,
  deleteBackup,
  downloadBackup,
} from '../controllers/backup.controller';

const router = Router();

router.get('/', authenticate, requirePlatformOwner, listBackups);
router.post('/run', authenticate, requirePlatformOwner, runBackup);
router.post('/restore', authenticate, requirePlatformOwner, restoreBackup);
router.get('/download/{*key}', authenticate, requirePlatformOwner, downloadBackup);
router.delete('/{*key}', authenticate, requirePlatformOwner, deleteBackup);

export default router;
