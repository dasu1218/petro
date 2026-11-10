import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
}, { timestamps: true });
export default mongoose.models.Inventory || mongoose.model('Inventory', schema);
