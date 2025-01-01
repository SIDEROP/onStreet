import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'StreetVendor', required: true },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        isPopular: { type: Boolean, default: false },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    pickupTime: { type: Date, required: true },
    otp: { type: Number, required: true, select: false },
    otpExpiresAt: {
      type: Date,
      required: true,
      default: function () {
        return new Date(this.pickupTime.getTime());
      },
    },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Order', OrderSchema);
