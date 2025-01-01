import { Router } from 'express';
import {
  converImagesUpload,
  editProfile,
  getProfile,
  register,
  toggleFollowVendor,
  deleteVendorImages,
  searchVendors,
  ratingVendor,
  getVendorDashboard,
} from '../controllers/streetVendor.contr.js';
import upload from '../middlewares/Multer.mid.js';
import authMiddleware from '../middlewares/Auth.mid.js';

const router = Router();
router.route('/register').post(upload.array('images'), register);
router.route('/get-profile').get(authMiddleware, getProfile);
router.route('/edit-profile').patch(authMiddleware, editProfile);
router.route('/upload-images').post(authMiddleware, upload.array('images'), converImagesUpload);
router.route('/delete-images').post(authMiddleware, deleteVendorImages);
router.route('/toggle-follow/:vendorId').patch(authMiddleware, toggleFollowVendor);
router.route('/search').get(authMiddleware, searchVendors);
router.route('/rate/:vendorId').post(authMiddleware, ratingVendor);
router.route('/dashboard').get(authMiddleware, getVendorDashboard);

export default router;