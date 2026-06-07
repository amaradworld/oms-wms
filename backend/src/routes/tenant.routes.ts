import { Router } from 'express';
import { getTenants, getTenant, createTenant, updateTenant, deleteTenant, updateMyTenant, getMyTenant, createTenantUser } from '../controllers/tenant.controller';
import { authenticate, authorize, requirePlatformOwner, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getTenants);
router.get('/me', authenticate, getMyTenant);
router.put('/me', authenticate, tenantScope, updateMyTenant);
router.use(authenticate);
router.use(authorize(['PLATFORM_ADMIN']));


router.get('/:id', getTenant);
router.post('/', createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);
router.post('/:id/users', requirePlatformOwner, createTenantUser);

export default router;
