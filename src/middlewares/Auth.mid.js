import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import StreetVendor from '../models/StreetVendor.model.js';
import ApiError from '../utils/ApiError.js';

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json(new ApiError(401, 'Unauthorized request'));
  }
  
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decodedToken?.id).select('-password -refreshToken');
  const vendor = await StreetVendor.findById(decodedToken?.id).select('-password');

  if (!user && !vendor) {
    return res.status(401).json(new ApiError(401, 'Invalid Access Token'));
  }

  if (user) {
    req.user = user;
  }

  if (vendor) {
    req.vendor = vendor;
  }

  next();
});

export default authMiddleware;
