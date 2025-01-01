import { Router } from 'express';
import {
  createOrder,
  updateOrderStatus,
  getUserOrders,
  getVendorOrders,
  verifyOrderOTP,
  cancelOrder
} from '../controllers/order.contr.js';
import authMiddleware from '../middlewares/Auth.mid.js';

const router = Router();

router.route('/create').post(authMiddleware, createOrder);
router.route('/status/:orderId').patch(authMiddleware, updateOrderStatus);
router.route('/get-user-orders').get(authMiddleware, getUserOrders);
router.route('/get-vendor-orders').get(authMiddleware, getVendorOrders);
router.route('/verify-otp/:orderId').post(authMiddleware, verifyOrderOTP);
router.route('/cancel/:orderId').delete(authMiddleware, cancelOrder);

export default router;
