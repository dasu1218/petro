import mongoose from 'mongoose';

const bundleSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  accent: { type: String, enum: ['rose', 'gold', 'teal'], default: 'rose' },
  isActive: { type: Boolean, default: true },
  items: {
    type: [{
      _id: false,
      slug: { type: String, required: true },
      variantLabel: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    }],
    validate: { validator: (items) => items.length > 0, message: 'A bundle needs at least one item' },
  },
}, { timestamps: true });

export default mongoose.models.Bundle || mongoose.model('Bundle', bundleSchema);
