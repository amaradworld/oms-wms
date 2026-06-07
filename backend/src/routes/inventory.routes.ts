import { Router } from 'express';
import { getInventory, scanInventory, getInventoryAlerts } from '../controllers/inventory.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);
router.post('/scan', authenticate, tenantScope, scanInventory);
router.get('/alerts', authenticate, getInventoryAlerts);

export default router;
