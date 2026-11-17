import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 2000 },
  category: { type: String, required: true },
  variants: [{ _id: false, label: String, price: Number, stock: Number }],
  badges: [String],
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });
export default mongoose.models.CatalogProduct || mongoose.model('CatalogProduct', schema);
