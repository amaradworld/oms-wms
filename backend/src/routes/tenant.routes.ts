import { Router } from 'express';
import { getTenants, getTenant, createTenant, updateTenant, deleteTenant } from '../controllers/tenant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['PLATFORM_ADMIN']));

router.get('/', getTenants);
router.get('/:id', getTenant);
router.post('/', createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

export default router;
