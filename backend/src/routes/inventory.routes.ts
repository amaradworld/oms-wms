import { Router } from 'express';
import { getInventory } from '../controllers/inventory.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);

export default router;
