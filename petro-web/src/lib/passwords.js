export function passwordChangeErrors(values) {
  const errors = {}
  if (!values.currentPassword) errors.currentPassword = 'Enter your current password.'
  if (typeof values.newPassword !== 'string' || values.newPassword.length < 8 || new TextEncoder().encode(values.newPassword).length > 72) errors.newPassword = 'Use at least 8 characters and at most 72 UTF-8 bytes.'
  else if (values.currentPassword === values.newPassword) errors.newPassword = 'Choose a different new password.'
  if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'The new passwords do not match.'
  return errors
}
