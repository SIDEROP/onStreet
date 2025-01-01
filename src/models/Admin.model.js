import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    avatar: {
      type: String,
      default: function () {
        return `https://avatar.iran.liara.run/username?username=${this.name}&bold=false&length=1`;
      },
    },
    role: { type: String, enum: ['admin'], default: 'admin' },
  },
  { timestamps: true },
);

export default mongoose.model('Admin', AdminSchema);