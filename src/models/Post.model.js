import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'StreetVendor', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    price: { type: String},
    isForSale: { type: Boolean, default: false },
    images: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('Post', PostSchema);