import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const StreetVendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true,unique: true },
    address: { type: String, required: true },
    businessType: { type: String, required: true },
    category: { type: String, required: true, enum: ['restaurant', 'dhaba', 'food_cart', 'food_truck', 'tiffin_service', 'street_food'] },
    avatar: {
      type: String,
      default: function () {
        return `https://avatar.iran.liara.run/username?username=${this.name}&bold=false&length=1`;
      },
    },
    images: [{ type: String, maxlength: 3 }],
    availability: { type: Boolean, default: true },
    role: { type: String, enum: ['vendor'], default: 'vendor' },
    description: { type: String },
    cuisine: { type: String },
    ratings: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      value: { type: Number, required: true }
    }],
    rating: { type: Number, default: 0 },
    reviews: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, required: true },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    menu: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      description: { type: String},
      isPopular: { type: Boolean, default: false },
    }],
    socketId: { type: String },
    isVerified: { type: Boolean, default: false },
    operatingHours: {
      start: { type: String },
      end: { type: String }
    }
  },
  { timestamps: true },
);

// Convert time to 12-hour format with AM/PM
StreetVendorSchema.pre('save', function(next) {
  if (this.operatingHours) {
    if (this.operatingHours.start) {
      const [hours, minutes] = this.operatingHours.start.split(':');
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      this.operatingHours.start = `${formattedHours}:${minutes} ${period}`;
    }

    if (this.operatingHours.end) {
      const [hours, minutes] = this.operatingHours.end.split(':');
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      this.operatingHours.end = `${formattedHours}:${minutes} ${period}`;
    }
  }
  next();
});


StreetVendorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 9);
  next();
});

StreetVendorSchema.methods.comparePassword = async function (password) {
  const vendor = await this.constructor.findById(this._id).select('+password');
  return await bcrypt.compare(password, vendor.password);
};

StreetVendorSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export default mongoose.model('StreetVendor', StreetVendorSchema);