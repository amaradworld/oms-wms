import { Router } from 'express';
import { getUsers, updateUser, createUser } from '../controllers/user.controller';
import { authenticate, tenantScope} from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getUsers);
router.post('/', authenticate, tenantScope, createUser);
router.put('/:id', authenticate, tenantScope, updateUser);

export default router;
