import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    phone: { type: String },
    avatar: {
      type: String,
      default: function () {
        return `https://avatar.iran.liara.run/username?username=${this.name}&bold=false&length=1`;
      },
    },
    address: { type: String },
    role: { type: String, enum: ['user','admin'], required: true },
    socketId: { type: String },
  },
  { timestamps: true },
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 9);
  next();
});

UserSchema.methods.comparePassword = async function (password) {
  const user = await this.constructor.findById(this._id).select('+password');
  return await bcrypt.compare(password, user.password);
};

UserSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export default mongoose.model('User', UserSchema);