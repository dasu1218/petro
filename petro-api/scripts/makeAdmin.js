import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: npm run make-admin -- your-account-email');
  process.exitCode = 1;
} else {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin' }, $inc: { __v: 1 } });
    if (!user) throw new Error('Account not found. Register your account first.');
    console.log('Admin access granted to the specified account. Log out and back in.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
