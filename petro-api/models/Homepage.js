import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  image: { _id: false, url: String, publicId: String },
  alt: { type: String, maxlength: 160, default: '' },
}, { timestamps: true });
export default mongoose.models.Homepage || mongoose.model('Homepage', schema);
