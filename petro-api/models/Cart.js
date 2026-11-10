import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    _id: false,
    slug: { type: String, required: true },
    variantLabel: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
}, { timestamps: true });

export default mongoose.models.Cart || mongoose.model('Cart', cartSchema);
