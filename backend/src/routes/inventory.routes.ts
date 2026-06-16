import { Router } from 'express';
import { getInventory, scanInventory, getInventoryAlerts, assignAbcClass } from '../controllers/inventory.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createInventorySchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getInventory);
router.post('/scan', authenticate, tenantScope, validate(createInventorySchema), scanInventory);
router.get('/alerts', authenticate, getInventoryAlerts);
router.post('/abc-class', authenticate, tenantScope, assignAbcClass);

export default router;
