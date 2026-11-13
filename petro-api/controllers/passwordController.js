import User from '../models/User.js';
import { validNewPassword } from '../services/passwords.js';
export async function changePassword(request, response) {
  const { currentPassword, newPassword } = request.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword || !validNewPassword(newPassword)) return response.status(400).json({ message: 'Enter your current password and a new password of at least 8 characters and at most 72 UTF-8 bytes' });
  const user = await User.findById(request.user._id).select('+password');
  if (!user || !await user.matchPassword(currentPassword)) return response.status(403).json({ message: 'Current password is incorrect' });
  if (await user.matchPassword(newPassword)) return response.status(400).json({ message: 'Choose a different new password' });
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  response.json({ message: 'Password changed. Please log in again on your devices.' });
}
