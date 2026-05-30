import { Router } from 'express';
import { getAuditLogs, exportAuditLogs } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PLATFORM_ADMIN']), getAuditLogs);
router.get('/export', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PLATFORM_ADMIN']), exportAuditLogs);

export default router;
