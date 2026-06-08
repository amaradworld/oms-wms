import { Router } from 'express';
import { trackByAWB } from '../controllers/track.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:awb', authenticate, trackByAWB);

export default router;
