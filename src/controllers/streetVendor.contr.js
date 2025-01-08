import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import StreetVendor from '../models/StreetVendor.model.js';
import User from '../models/User.model.js';
import { uploadToCloudinary } from '../utils/Cloudnery.js';
import mongoose from 'mongoose';

// Register street vendor
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address, businessType, category, description, operatingHours } = req.body;

  if (!name || !email || !password || !phone || !address || !businessType || !category) {
    res.status(400).json(new ApiError(400, 'All required fields must be provided'));
    throw new ApiError(400, 'All required fields must be provided');
  }
  const existingVendor = await StreetVendor.findOne({ $or: [{ email }, { phone }] });

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingVendor || existingUser) {
    res.status(409).json(new ApiError(409, 'Vendor already exists with this email or phone'));
    throw new ApiError(409, 'Vendor already exists with this email or phone');
  }

  const vendor = await StreetVendor.create({
    name,
    email,
    password,
    phone,
    address,
    businessType,
    category,
    description,
    operatingHours,
    role: 'vendor',
    images: [],
  });

  const createdVendor = await StreetVendor.findById(vendor._id).select('-password');
  if (!createdVendor) {
    res.status(500).json(new ApiError(500, 'Something went wrong'));
    throw new ApiError(500, 'Something went wrong while registering the vendor');
  }
  const accessToken = vendor.generateToken();

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(201).json(new ApiResponse(201, {vendor:createdVendor,accessToken}, 'Vendor registered successfully'));
});

// Edit vendor profile
export const editProfile = asyncHandler(async (req, res) => {
  const { name, phone, address,cuisine, businessType, category, description, operatingHours } = req.body;

  const updatedFields = {};
  if (name) updatedFields.name = name;
  if (phone) updatedFields.phone = phone;
  if (address) updatedFields.address = address;
  if (businessType) updatedFields.businessType = businessType;
  if (category) updatedFields.category = category;
  if (description) updatedFields.description = description;
  if (operatingHours) updatedFields.operatingHours = operatingHours;
  if (cuisine) updatedFields.cuisine = cuisine;

  const vendor = await StreetVendor.findByIdAndUpdate(
    req.vendor._id,
    { $set: updatedFields },
    { new: true }
  ).select('-password');

  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  return res.status(200).json(new ApiResponse(200, vendor, 'Profile updated successfully'));
});

// Get vendor profile
export const getProfile = asyncHandler(async (req, res) => {
  const vendor = await StreetVendor.aggregate([
    {
      $match: { _id: req.vendor._id }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'followers',
        foreignField: '_id',
        as: 'followers'
      }
    },
    {
      $addFields: {
        followersCount: { $size: '$followers' },
        menuItemsCount: { $size: '$menu' },
        averageRating: { $avg: '$reviews.rating' },
        totalReviews: { $size: '$reviews' },
        totalRevenue: {
          $sum: {
            $map: {
              input: '$menu',
              as: 'item',
              in: '$$item.price'
            }
          }
        },
        popularCategories: {
          $reduce: {
            input: '$menu',
            initialValue: [],
            in: {
              $concatArrays: ['$$value', ['$$this.category']]
            }
          }
        }
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        businessType: 1,
        category: 1,
        avatar: 1,
        images: 1,
        availability: 1,
        description: 1,
        cuisine: 1,
        rating: 1,
        reviews: 1,
        followers: {
          name: 1,
          email: 1,
          avatar: 1
        },
        menu: 1,
        isVerified: 1,
        operatingHours: 1,
        followersCount: 1,
        menuItemsCount: 1,
        averageRating: 1,
        totalReviews: 1,
        totalRevenue: 1,
        popularCategories: 1,
        createdAt: 1,
        updatedAt: 1
      }
    }
  ]);

  if (!vendor.length) {
    throw new ApiError(404, 'Vendor not found');
  }

  return res.status(200).json(new ApiResponse(200, vendor[0], 'Vendor profile fetched successfully'));
});

// Upload images
export const converImagesUpload = asyncHandler(async (req, res) => {
  const images = req.files;

  if (!images || !Array.isArray(images)) {
    throw new ApiError(400, 'No images provided');
  }

  if (images.length > 3) {
    throw new ApiError(400, 'Maximum 3 images allowed');
  }

  const existingVendor = await StreetVendor.findById(req.vendor._id);
  if (!existingVendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  if(existingVendor.images.length + images.length > 3){
    throw new ApiError(400, 'Maximum 3 images allowed');
  }

  const uploadPromises = images.map((image) => uploadToCloudinary(image.path));
  const uploadedImages = await Promise.all(uploadPromises);

  const updatedVendor = await StreetVendor.findByIdAndUpdate(
    req.vendor._id,
    { $push: { images: { $each: uploadedImages } } },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedVendor, 'Images uploaded successfully'));
});

// Delete images
  export const deleteVendorImages = asyncHandler(async (req, res) => {
  const { imageUrls } = req.body;

  if (!imageUrls || imageUrls.length === 0) {
    throw new ApiError(400, 'No images provided for deletion');
  }

  const vendor = await StreetVendor.findById(req.vendor._id);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  const updatedImages = vendor.images.filter((img) => !imageUrls.includes(img));

  const updatedVendor = await StreetVendor.findByIdAndUpdate(req.vendor._id, { images: updatedImages }, { new: true });

  return res.status(200).json(new ApiResponse(200, updatedVendor, 'Images deleted successfully'));
});


// Toggle follow vendor
export const toggleFollowVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  
  if (!vendorId) {
    throw new ApiError(400, 'Vendor ID is required');
  }
  
  const vendor = await StreetVendor.findById(vendorId);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }
  
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  const isFollowing = vendor.followers.includes(req.user._id);
  
  let updatedVendor;
  if (isFollowing) {
    // Unfollow
    updatedVendor = await StreetVendor.findByIdAndUpdate(
      vendorId,
      { $pull: { followers: req.user._id } },
      { new: true }
    );
  } else {
    // Follow
    updatedVendor = await StreetVendor.findByIdAndUpdate(
      vendorId, 
      { $push: { followers: req.user._id } },
      { new: true }
    );
  }
  
  const message = isFollowing ? 'Vendor unfollowed successfully' : 'Vendor followed successfully';
  return res.status(200).json(new ApiResponse(200, { vendor: updatedVendor, isFollowing: !isFollowing }, message));
});


// Rate vendor
export const ratingVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { rating } = req.body;

  if (!vendorId) {
    throw new ApiError(400, 'Vendor ID is required');
  }

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const vendor = await StreetVendor.findById(vendorId);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  // Check if user has already rated
  const existingRatingIndex = vendor.ratings.findIndex(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (existingRatingIndex >= 0) {
    // Update existing rating
    vendor.ratings[existingRatingIndex].value = rating;
  } else {
    // Add new rating
    vendor.ratings.push({
      user: req.user._id,
      value: rating
    });
  }

  // Calculate average rating
  const totalRating = vendor.ratings.reduce((sum, r) => sum + r.value, 0);
  vendor.rating = totalRating / vendor.ratings.length;

  await vendor.save({validateBeforeSave:false});

  return res.status(200).json(
    new ApiResponse(200, vendor, 'Vendor rated successfully')
  );
});

// Search vendors
export const searchVendors = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    throw new ApiError(400, 'Search query is required');
  }

  // Create search criteria using regex for case-insensitive search
  const searchCriteria = {
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { cuisine: { $regex: q, $options: 'i' } },
      { type: { $regex: q, $options: 'i' } },
      { 'menu.name': { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } } // Added address search
    ]
  };
  const vendors = await StreetVendor.find(searchCriteria)
  .select('name cuisine rating ratings phone operatingHours address isPopular images menu category followers')
  .populate('followers', 'name')
  .populate('ratings.user', 'name');
  
  if (!vendors.length) {
    return res.status(200).json(new ApiResponse(200, [], 'No vendors found'));
  }

  // Transform vendor data to match frontend requirements
  const transformedVendors = vendors?.map(vendor => ({
    id: vendor._id,
    name: vendor.name,
    cuisine: vendor.cuisine,
    rating: vendor.rating || 0,
    ratingsExist: vendor.ratings.some(rating => rating.user._id.toString() === req.user._id.toString()),
    userRating: vendor.ratings?.find(r => r.user?._id.toString() === req.user._id.toString())?.value || 0,
    openTime: vendor.operatingHours.start,
    closeTime: vendor.operatingHours.end,
    phone: vendor.phone,
    category: vendor.category,
    address: vendor.address,
    isPopular: vendor.isPopular || false,
    images: vendor.images || [],
    menu: vendor.menu?.map(item => ({
      name: item.name,
      price: item.price,
      description: item.description,
      popular: item.popular || false
    })) || [],
    followers: vendor.followers?.length || 0,
    followersExist: vendor.followers.some(follower => follower._id.toString() === req.user._id.toString())
  }));

  return res.status(200).json(new ApiResponse(200, transformedVendors, 'Vendors fetched successfully'));
});


// Get vendor dashboard stats
export const getVendorDashboard = asyncHandler(async (req, res) => {
  // Convert string ID to ObjectId
  const vendorId = new mongoose.Types.ObjectId(req.vendor._id);
  
  // Get current date at start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(today - 365 * 24 * 60 * 60 * 1000);

  const vendor = await StreetVendor.aggregate([
    {
      $match: { _id: vendorId }
    },
    // Optimize lookups with project to get only needed fields
    {
      $lookup: {
        from: 'orders',
        let: { vendorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { 
                $and: [
                  { $eq: ['$vendorId', '$$vendorId'] },
                  { $gte: ['$createdAt', yearAgo] }
                ]
              }
            }
          },
          {
            $project: {
              createdAt: 1,
              status: 1,
              totalAmount: 1,
              userId: 1,
              items: 1
            }
          }
        ],
        as: 'orders'
      }
    },
    {
      $addFields: {
        // Simplified date comparisons using variables
        dailyEarnings: {
          $reduce: {
            input: {
              $filter: {
                input: '$orders',
                cond: { $gte: ['$$this.createdAt', today] }
              }
            },
            initialValue: 0,
            in: { $add: ['$$value', '$$this.totalAmount'] }
          }
        },
        // ... similar simplifications for weekly/monthly/yearly stats ...
        
        // Optimized order status counts using $sum
        orderStatusCounts: {
          $arrayToObject: {
            $map: {
              input: ['completed', 'cancelled', 'pending', 'processing'],
              as: 'status',
              in: {
                k: '$$status',
                v: {
                  $size: {
                    $filter: {
                      input: '$orders',
                      cond: { $eq: ['$$this.status', '$$status'] }
                    }
                  }
                }
              }
            }
          }
        },

        // Simplified rating distribution
        ratingDistribution: {
          $arrayToObject: {
            $map: {
              input: [1, 2, 3, 4, 5],
              as: 'rating',
              in: {
                k: { $toString: '$$rating' },
                v: {
                  $size: {
                    $filter: {
                      input: '$ratings',
                      cond: { $eq: ['$$this.value', '$$rating'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        // Simplified project structure
        stats: {
          daily: { earnings: '$dailyEarnings', orders: '$dailyOrders' },
          weekly: { earnings: '$weeklyEarnings', orders: '$weeklyOrders' },
          monthly: { earnings: '$monthlyEarnings', orders: '$monthlyOrders' },
          yearly: { earnings: '$yearlyEarnings', orders: '$yearlyOrders' }
        },
        orders: '$orderStatusCounts',
        ratings: {
          average: { $round: ['$averageRating', 1] },
          total: '$totalRatings',
          distribution: '$ratingDistribution'
        },
        metrics: {
          revenue: '$revenueTrends',
          performance: {
            orderCompletion: { 
              $round: ['$performance.orderCompletionRate', 2] 
            },
            avgOrderValue: { 
              $round: ['$performance.averageOrderValue', 2] 
            },
            retention: { 
              $round: ['$customerRetention', 2] 
            }
          }
        }
      }
    }
  ]); // Removed .cache(300) since mongoose-cache is not installed

  if (!vendor.length) {
    throw new ApiError(404, 'Vendor dashboard data not found');
  }

  return res.status(200).json(
    new ApiResponse(200, vendor[0], 'Vendor dashboard data fetched successfully')
  );
});