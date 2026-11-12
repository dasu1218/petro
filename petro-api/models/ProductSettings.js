import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  isArchived: { type: Boolean, default: false },
  details: { name: String, description: String, category: String, badges: [String] },
  images: [{ _id: false, url: String, publicId: String, originalUrl: String, enhancedUrl: String }],
  prices: [{ _id: false, label: String, price: Number }],
  promotion: { enabled: Boolean, label: String, percent: Number, startsAt: Date, endsAt: Date },
}, { timestamps: true });
export default mongoose.models.ProductSettings || mongoose.model('ProductSettings', schema);
