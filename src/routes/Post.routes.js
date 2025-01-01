import { Router } from "express";
import { addComment, createPost, deleteComment, deletePost, getAllPosts, getVendorPosts, toggleLikePost } from "../controllers/post.contr.js";
import authMiddleware from "../middlewares/Auth.mid.js";
import upload from "../middlewares/Multer.mid.js";

const router = Router();

router.route('/create-post').post(authMiddleware, upload.array('images', 5), createPost);
router.route('/get-all-posts').get(authMiddleware, getAllPosts);
router.route('/get-vendor-posts').get(authMiddleware, getVendorPosts);
router.route('/delete-post/:id').delete(authMiddleware, deletePost);
router.route('/toggle-like-post/:postId').patch(authMiddleware, toggleLikePost);
router.route('/add-comment/:postId').post(authMiddleware, addComment);
router.route('/delete-comment/:postId/:commentId').delete(authMiddleware, deleteComment);

export default router;