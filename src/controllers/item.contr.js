import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import StreetVendor from '../models/StreetVendor.model.js';

// Add item to vendor's menu
export const addItem = asyncHandler(async (req, res) => {
  const { name, price, description, isPopular } = req.body;

  if (!name || !price) {
    throw new Error('Name, price and category are required');
  }

  const vendor = await StreetVendor.findById(req.vendor._id);

  vendor.menu.push({
    name,
    price,
    description,
    isPopular,
  });

  await vendor.save({ validateBeforeSave: false });

  return res.status(201).json(new ApiResponse(201, vendor.menu[vendor.menu.length - 1], 'Item added successfully'));
});

// Delete item from vendor's menu
export const deleteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const vendor = await StreetVendor.findById(req.vendor._id);

  const itemIndex = vendor.menu.findIndex((menu) => menu._id.toString() === itemId);

  if (itemIndex === -1) {
    throw new Error('Item not found');
  }

  vendor.menu.splice(itemIndex, 1);
  await vendor.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, 'Item deleted successfully'));
});

// Get items for a specific vendor
export const getVendorItems = asyncHandler(async (req, res) => {
  const vendor = await StreetVendor.findById(req.vendor._id);

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  return res.status(200).json(new ApiResponse(200, vendor.menu, 'Items fetched successfully'));
});
