import { Router } from 'express';
import { getUsers, updateUser, createUser } from '../controllers/user.controller';
import { authenticate, authorize, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getUsers);
router.post('/', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'PLATFORM_ADMIN']), createUser);
router.put('/:id', authenticate, tenantScope, authorize(['SUPER_ADMIN', 'PLATFORM_ADMIN']), updateUser);

export default router;
