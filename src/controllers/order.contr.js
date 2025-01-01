import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/apiResponse.js';
import Order from '../models/Order.model.js';
import StreetVendor from '../models/StreetVendor.model.js';
import crypto from 'crypto';

// Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const { vendorId, items, pickupTime } = req.body;

  if (!vendorId || !items || !pickupTime || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'All required fields must be provided');
  }

  // Get vendor details to get their address
  const vendor = await StreetVendor.findById(vendorId);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Generate cryptographically secure OTP
  const otp = crypto.randomInt(1000, 9999);

  const order = await Order.create({
    userId: req.user._id,
    vendorId,
    items,
    totalAmount,
    pickupTime,
    otp
  });

  return res.status(201).json(new ApiResponse(201, order, 'Order created successfully'));
});

// Get user orders
export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate('vendorId', 'name email phone address')
    .sort('-createdAt')
    .select({
      userId: 1,
      vendorId: 1,
      items: {
        name: 1,
        quantity: 1,
        price: 1,
        notes: 1
      },
      totalAmount: 1,
      status: 1,
      pickupTime: 1,
      createdAt: 1,
      updatedAt: 1,
      verified: 1,
      otpExpiresAt: 1,
      otp: 1
    });

  const formattedOrders = orders.map(order => ({
    id: order._id,
    vendor: order.vendorId.name,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || null
    })),
    total: order.totalAmount,
    status: order.status,
    date: order.createdAt.toISOString().split('T')[0],
    deliveryAddress: order.vendorId.address,
    orderTime: order.createdAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    otp: order.otp?.toString() || null,
    isExpired: new Date() > order.otpExpiresAt,
    pickupTime: order.pickupTime,
    verified: order.verified
  }));

  return res.status(200).json(new ApiResponse(200, formattedOrders, 'User orders fetched successfully'));
});

// Get vendor orders
export const getVendorOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ vendorId: req.vendor._id })
    .populate('userId', 'name email phone')
    .sort('-createdAt')
    .select({
      userId: 1,
      vendorId: 1,
      items: {
        name: 1,
        quantity: 1,
        price: 1,
        isPopular: 1
      },
      totalAmount: 1,
      status: 1,
      pickupTime: 1,
      createdAt: 1,
      updatedAt: 1,
      verified: 1,
      otpExpiresAt: 1
    })
    .select('-otp');

  const formattedOrders = orders.map(order => ({
    _id: order._id,
    userId: {
      _id: order.userId._id,
      name: order.userId.name,
      email: order.userId.email,
      phone: order.userId.phone
    },
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      isPopular: item.isPopular,
      _id: item._id
    })),
    totalAmount: order.totalAmount,
    status: order.status,
    pickupTime: order.pickupTime,
    verified: order.verified,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    isExpired: new Date() > order.otpExpiresAt
  }));

  return res.status(200).json(new ApiResponse(200, formattedOrders, 'Vendor orders fetched successfully'));
});

// Verify order OTP
export const verifyOrderOTP = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { otp } = req.body;

  if (!orderId || !otp) {
    throw new ApiError(400, 'Order ID and OTP are required');
  }

  const order = await Order.findById(orderId).select('otp otpExpiresAt verified');
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.verified) {
    throw new ApiError(400, 'Order is already verified');
  }

  if (order.otp != otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  if (new Date() > order.otpExpiresAt) {
    throw new ApiError(400, 'OTP has expired');
  }

  order.verified = true;
  await order.save();

  return res.status(200).json(
    new ApiResponse(200, order, 'Order verified successfully')
  );
});


// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  
  const { status } = req.body;
  
  if (!status || !["pending", "accepted", "in-progress", "completed", "cancelled"].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const existingOrder = await Order.findById(req.params.orderId);

  if (!existingOrder) {
    throw new ApiError(404, 'Order not found');
  }

  if (!existingOrder.verified) {
    throw new ApiError(400, 'Order is not verified');
  }

  if (existingOrder.status === "completed") {
    throw new ApiError(400, 'Cannot change status of completed order');
  }

  if (existingOrder.status === "cancelled") {
    throw new ApiError(400, 'Cannot change status of cancelled order');
  }

  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { status },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, order, 'Order status updated successfully'));
});

// Cancel order by user
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Verify order belongs to requesting user
  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to cancel this order');
  }

  // Only pending orders can be cancelled by user
  if (order.status !== 'pending') {
    throw new ApiError(400, 'Only pending orders can be cancelled');
  }

  order.status = 'cancelled';
  await order.save();

  return res.status(200).json(
    new ApiResponse(200, order, 'Order cancelled successfully')
  );
});
