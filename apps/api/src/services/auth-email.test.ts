import assert from 'node:assert/strict'
import test from 'node:test'
import {
  otpEmail,
  passwordResetEmail,
  verificationEmail,
  workspaceInvitationEmail
} from './auth-email.js'

test('verification template escapes user-provided names and includes the code expiry', () => {
  const email = verificationEmail('<Zohaib & Co>', '123456')

  assert.match(email.subject, /Verify your Structura email/)
  assert.match(email.html, /&lt;Zohaib &amp; Co&gt;/)
  assert.match(email.html, /123456/)
  assert.match(email.text, /expires in 15 minutes/)
})

test('OTP template includes its code and expiry', () => {
  const email = otpEmail('Zohaib', '654321')

  assert.match(email.html, /654321/)
  assert.match(email.text, /expires in 10 minutes/)
})

test('password reset template escapes link attributes', () => {
  const email = passwordResetEmail('Zohaib', 'https://example.test/reset?a=1&b=2')

  assert.match(email.html, /href="https:\/\/example\.test\/reset\?a=1&amp;b=2"/)
  assert.match(email.text, /expires in 30 minutes/)
})

test('workspace invitation template escapes names and acceptance URLs', () => {
  const message = workspaceInvitationEmail(
    '<Owner>',
    'Platform & Core',
    'https://example.test/en/dashboard?invitation=secure-token'
  )

  assert.equal(message.subject, 'Invitation to join Platform & Core on Structura')
  assert.match(message.html, /&lt;Owner&gt;/)
  assert.match(message.html, /Platform &amp; Core/)
  assert.match(message.html, /href="https:\/\/example\.test\/en\/dashboard\?invitation=secure-token"/)
  assert.match(message.text, /expires in 7 days/)
})
