import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true, maxlength: 40 },
  fullName: String, email: String, phone: String, addressLine1: String,
  addressLine2: String, city: String, postalCode: String,
  country: { type: String, enum: ['Sri Lanka'], default: 'Sri Lanka' },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    tokenVersion: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    addresses: { type: [addressSchema], default: [] },
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, optimisticConcurrency: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const { _id, name, email, role, createdAt } = this;
  return { id: _id, name, email, role, createdAt, addresses: this.addresses.map((address) => address.toObject()), defaultAddressId: this.defaultAddressId };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
