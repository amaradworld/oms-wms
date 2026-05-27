import { Router } from 'express';
import { getWarehouses, getWarehouseById, createWarehouse, updateWarehouse, getFacilities, createFacility, getMasterView } from '../controllers/warehouse.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getWarehouses);
router.get('/master-view', authenticate, getMasterView);
router.get('/:id', authenticate, getWarehouseById);
router.post('/', authenticate, createWarehouse);
router.patch('/:id', authenticate, updateWarehouse);
router.get('/:id/facilities', authenticate, getFacilities);
router.post('/:id/facilities', authenticate, createFacility);

export default router;
