import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestId: { type: String, required: true },
  requestHash: { type: String, required: true, select: false },
  items: [{
    _id: false, slug: String, name: String, variantLabel: String,
    kind: String, quantity: Number, price: Number,
    components: [{ _id: false, slug: String, variantLabel: String, quantity: Number }],
  }],
  shippingAddress: {
    fullName: String, email: String, phone: String, addressLine1: String,
    addressLine2: String, city: String, postalCode: String, country: String,
  },
  deliveryMethod: { type: String, enum: ['standard', 'express'], required: true },
  paymentMethod: { type: String, enum: ['cod'], required: true },
  totals: { subtotal: Number, delivery: Number, total: Number },
  status: { type: String, enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
}, { timestamps: true });
schema.index({ user: 1, requestId: 1 }, { unique: true });
export default mongoose.models.Order || mongoose.model('Order', schema);
