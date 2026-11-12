import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestId: { type: String, required: true },
  requestHash: { type: String, required: true, select: false },
  slug: { type: String, required: true, index: true },
  variantLabel: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, maxlength: 200 },
  stockAfter: { type: Number, required: true },
}, { timestamps: true });
schema.index({ user: 1, requestId: 1 }, { unique: true });
export default mongoose.models.Restock || mongoose.model('Restock', schema);
