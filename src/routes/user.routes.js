import router from 'express';
import authMiddleware from '../middlewares/Auth.mid.js';

// import controllers
import { login, register, logout, authentication, googleAuth, googleAuthCallback, updateUser } from '../controllers/user.contr.js';

// routes initialization
const route = router.Router();

// routes
route.post('/login', login)
.post('/register', register)
.get('/logout', authMiddleware, logout)
.get('/authentication', authentication)
.get('/auth/google', googleAuth)
.get('/auth/google/callback', googleAuthCallback)
.put('/update', authMiddleware, updateUser)

export default route