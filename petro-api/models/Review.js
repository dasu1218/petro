import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slug: { type: String, required: true, index: true },
  authorName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true });
schema.index({ user: 1, slug: 1 }, { unique: true });
export default mongoose.models.Review || mongoose.model('Review', schema);
