import { Router } from 'express';
import { addItem, deleteItem, getVendorItems } from '../controllers/item.contr.js';
import authMiddleware from '../middlewares/Auth.mid.js';

const router = Router();

router.route('/add-items').post(authMiddleware, addItem);
router.route('/delete-item/:itemId').delete(authMiddleware, deleteItem);
router.route('/get-items').get(authMiddleware, getVendorItems);

export default router;