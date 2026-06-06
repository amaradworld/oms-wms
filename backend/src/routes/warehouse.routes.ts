import { Router } from 'express';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  getFacilities,
  createFacility,
  getMasterView,
  getFacilitySequences,
  updateFacilitySequence,
  getFacilityActivity,
} from '../controllers/warehouse.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createWarehouseSchema, createFacilitySchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getWarehouses);
router.get('/master-view', authenticate, getMasterView);
router.get('/:id', authenticate, getWarehouseById);
router.post('/', authenticate, validate(createWarehouseSchema), createWarehouse);
router.patch('/:id', authenticate, updateWarehouse);
router.get('/:id/facilities', authenticate, getFacilities);
router.post('/:id/facilities', authenticate, validate(createFacilitySchema), createFacility);
router.get('/:id/sequences', authenticate, getFacilitySequences);
router.patch('/:id/sequences/:seqId', authenticate, updateFacilitySequence);
router.get('/:id/activity', authenticate, getFacilityActivity);

export default router;
