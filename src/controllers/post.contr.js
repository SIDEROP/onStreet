import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import Post from '../models/Post.model.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/Cloudnery.js';
import Comment from '../models/Comments.js';
// Create a new post
export const createPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const files = req.files;

  if (!title || !content) {
    throw new ApiError(400, 'Title and content are required');
  }

  // Upload images to cloudinary
  const imageUrls = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const imageUrl = await uploadToCloudinary(file.path);
      imageUrls.push(imageUrl);
    }
  }

  const post = await Post.create({
    title,
    content,
    vendorId: req.vendor.id,
    images: imageUrls
  });

  return res.status(201).json(new ApiResponse(201, post, 'Post created successfully'));
});

// Get all posts
export const getAllPosts = asyncHandler(async (req, res) => {
  const posts = await Post.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'streetvendors',
        localField: 'vendorId',
        foreignField: '_id',
        pipeline: [
          { 
            $project: { 
              name: 1,
              email: 1,
              avatar: 1,
              address: 1,
              followers: 1,
              businessType: 1,
              category: 1,
              availability: 1,
              description: 1,
              cuisine: 1,
              rating: 1,
              menu: 1,
              operatingHours: 1
            } 
          }
        ],
        as: 'vendor'
      }
    },
    { $unwind: '$vendor' },
    {
      $lookup: {
        from: 'users',
        localField: 'vendor.followers',
        foreignField: '_id',
        as: 'vendor.followers'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'likes',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, email: 1, avatar: 1 } }
        ],
        as: 'likedBy'
      }
    },
    {
      $lookup: {
        from: 'comments',
        localField: 'comments',
        foreignField: '_id',
        pipeline: [
          { $match: { isActive: true } },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              pipeline: [
                { $project: { name: 1, email: 1, avatar: 1 } }
              ],
              as: 'user'
            }
          },
          { $unwind: '$user' }
        ],
        as: 'comments'
      }
    },
    {
      $addFields: {
        'vendor.followersExist': {
          $in: [req.user?._id || req.user._id, '$vendor.followers._id']
        },
        'vendor.id': '$vendor._id',
        'vendor.totalFollowCount': { $size: '$vendor.followers' },
        'isLiked': {
          $in: [req.user?._id || req.user._id, '$likes']
        },
        'likesCount': { $size: '$likes' },
        'commentsCount': { $size: '$comments' }
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        'vendor.followers': 0,
        'vendor._id': 0,
        likes: 0
      }
    }
  ]);

  return res.status(200).json(new ApiResponse(200, posts, 'Posts fetched successfully'));
});

// Get post by ID
export const getVendorPosts = asyncHandler(async (req, res) => {
  const posts = await Post.aggregate([
    { 
      $match: {
        vendorId: req.vendor._id,
      } 
    },
    {
      $lookup: {
        from: 'streetvendors',
        localField: 'vendorId',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, email: 1 } }
        ],
        as: 'vendor'
      }
    },
    { $unwind: '$vendor' },
    {
      $lookup: {
        from: 'users',
        localField: 'likes',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, email: 1 } }
        ],
        as: 'likedBy'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'comments.user',
        foreignField: '_id',
        pipeline: [
          { $project: { name: 1, email: 1 } }
        ],
        as: 'commentUsers'
      }
    },
    {
      $addFields: {
        comments: {
          $map: {
            input: '$comments',
            as: 'comment',
            in: {
              user: {
                $arrayElemAt: [
                  '$commentUsers',
                  { $indexOfArray: ['$comments.user', '$$comment.user'] }
                ]
              },
              comment: '$$comment.comment',
              createdAt: '$$comment.createdAt'
            }
          }
        }
      }
    },
    { $project: { commentUsers: 0 } },
    { $sort: { createdAt: -1 } }
  ]);

  if (!posts || posts.length === 0) {
    throw new ApiError(404, 'No posts found for this vendor');
  }

  return res.status(200).json(new ApiResponse(200, posts, 'Vendor posts fetched successfully'));
});

// Delete post
export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  if (post.vendorId.toString() !== req.vendor.id) {
    throw new ApiError(403, 'Not authorized to delete this post');
  }

  // Delete post images from Cloudinary
  if (post.images && post.images.length > 0) {
    for (const imageUrl of post.images) {
      // Extract public ID from Cloudinary URL
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await deleteFromCloudinary(publicId);
    }
  }

  await Post.findByIdAndDelete(req.params.id);

  return res.status(200).json(new ApiResponse(200, null, 'Post deleted successfully'));
});


// Toggle like post
export const toggleLikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  
  if (!postId) {
    throw new ApiError(400, 'Post ID is required');
  }
  
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }
  
  const isLiked = post.likes.includes(req.user._id);
  
  let updatedPost;
  if (isLiked) {
    // Unlike
    updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likes: req.user._id } },
      { new: true }
    );
  } else {
    // Like
    updatedPost = await Post.findByIdAndUpdate(
      postId, 
      { $push: { likes: req.user._id } },
      { new: true }
    );
  }
  
  const message = isLiked ? 'Post unliked successfully' : 'Post liked successfully';
  return res.status(200).json(new ApiResponse(200, { post: updatedPost, isLiked: !isLiked }, message));
});


// Add comment to post
export const addComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;

  if (!postId) {
    throw new ApiError(400, 'Post ID is required');
  }

  if (!comment || comment.trim() === '') {
    throw new ApiError(400, 'Comment is required');
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  // Create new comment document
  const newComment = await Comment.create({
    user: req.user._id,
    post: postId,
    comment: comment.trim()
  });

  // Add comment reference to post
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $push: { comments: newComment._id } },
    { new: true }
  );

  // Get populated comment data
  const populatedComment = await Comment.findById(newComment._id).populate({
    path: 'user',
    select: 'name email avatar'
  });

  return res.status(200).json(
    new ApiResponse(200, { comment: populatedComment }, 'Comment added successfully')
  );
});

// Delete comment from post
export const deleteComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;

  if (!postId || !commentId) {
    throw new ApiError(400, 'Post ID and Comment ID are required');
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, 'Post not found');
  }

  const comment = await Comment.findById(commentId);
  if (!comment || !comment.isActive) {
    throw new ApiError(404, 'Comment not found');
  }

  // Check if user is authorized to delete the comment
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to delete this comment');
  }

  // Soft delete the comment
  comment.isActive = false;
  await comment.save();

  // Remove comment reference from post
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $pull: { comments: commentId } },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, null, 'Comment deleted successfully')
  );
});
