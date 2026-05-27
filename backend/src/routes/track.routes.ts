import { Router } from 'express';
import { trackByAWB } from '../controllers/track.controller';

const router = Router();

router.get('/:awb', trackByAWB);

export default router;
