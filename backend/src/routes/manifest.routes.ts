import { Router } from 'express';
import {
  getManifests,
  getManifestById,
  createManifest,
  closeManifest,
  downloadManifestPdf,
  getShippedOrdersForManifest,
} from '../controllers/manifest.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getManifests);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), createManifest);
router.get('/shipped-orders', authenticate, getShippedOrdersForManifest);
router.get('/:id', authenticate, getManifestById);
router.patch('/:id/close', authenticate, authorize(['SUPER_ADMIN', 'WAREHOUSE_MGR']), closeManifest);
router.get('/:id/pdf', authenticate, downloadManifestPdf);

export default router;
