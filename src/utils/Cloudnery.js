import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
export const uploadToCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;
    
    // Upload the image
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    // Return the secure URL
    return result.secure_url;

  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    // Delete the image
    const result = await cloudinary.uploader.destroy(publicId);
    return result;

  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};