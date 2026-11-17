import assert from 'node:assert/strict'
import { test } from 'node:test'
import { passwordChangeErrors } from './passwords.js'
test('password forms require the current password and matching, sufficiently long new passwords', () => {
  assert.deepEqual(passwordChangeErrors({ currentPassword:'old-password',newPassword:'new-password',confirmPassword:'new-password' }), {})
  const errors = passwordChangeErrors({ currentPassword:'',newPassword:'short',confirmPassword:'different' })
  assert.ok(errors.currentPassword);assert.ok(errors.newPassword);assert.ok(errors.confirmPassword)
})
test('password validation rejects reuse and oversized UTF-8 input without trimming passwords', () => {
  assert.ok(passwordChangeErrors({ currentPassword:'same-password',newPassword:'same-password',confirmPassword:'same-password' }).newPassword)
  assert.ok(passwordChangeErrors({ currentPassword:'old',newPassword:'🙂'.repeat(20),confirmPassword:'🙂'.repeat(20) }).newPassword)
  assert.deepEqual(passwordChangeErrors({ currentPassword:'old-password',newPassword:' new password ',confirmPassword:' new password ' }), {})
})
