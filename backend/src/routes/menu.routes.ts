import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { MENU_CATALOG, getAllMenuIds } from '../config/menuCatalog';

const router = Router();

router.get('/', authenticate, (req, res) => {
  res.json({ menus: MENU_CATALOG, allIds: getAllMenuIds() });
});

export default router;
