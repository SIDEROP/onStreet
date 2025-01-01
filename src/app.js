import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"

// app initialization
const app = express();


//middleware
app.use(express.json())
.use(express.json({limit: "16kb", extended: true}))
.use(express.urlencoded({extended: true, limit: "16kb"}))
.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin", "Access-Control-Allow-Origin"],
}))
.use(cookieParser())
.use(express.static('dist'));

// import routes
import userRouter from './routes/user.routes.js';
import streetVendorRouter from './routes/streetVendor.routes.js';
import postRouter from './routes/Post.routes.js';
import itemRouter from './routes/item.routes.js';
import orderRouter from './routes/order.routes.js';

//export routes
app.use('/api/v1/user', userRouter);
app.use('/api/v1/vendor', streetVendorRouter);
app.use('/api/v1/post', postRouter);
app.use('/api/v1/item', itemRouter);
app.use('/api/v1/order', orderRouter);

export default app;