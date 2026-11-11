import nodemailer from 'nodemailer'
import { config } from '../config.js'

const transport = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  ...(config.mail.user ? { auth: { user: config.mail.user, pass: config.mail.password } } : {})
})

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] ?? character)
}

function emailLayout(title: string, content: string) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#f4f6fa;color:#182230;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;color:#3157d5;font-size:14px;font-weight:bold">STRUCTURA</p>
            <h1 style="font-size:24px;margin:0 0 16px">${title}</h1>
            ${content}
            <p style="margin:32px 0 0;color:#667085;font-size:13px">If you did not request this, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export function verificationEmail(name: string, code: string) {
  const greeting = escapeHtml(name)
  return {
    subject: 'Verify your Structura email',
    text: `Hi ${name}, your Structura verification code is ${code}. It expires in 15 minutes.`,
    html: emailLayout('Verify your email', `<p>Hi ${greeting}, use this code to finish setting up your account:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 15 minutes.</p>`)
  }
}

export function otpEmail(name: string, code: string) {
  const greeting = escapeHtml(name)
  return {
    subject: 'Your Structura sign-in code',
    text: `Hi ${name}, your Structura sign-in code is ${code}. It expires in 10 minutes.`,
    html: emailLayout('Your sign-in code', `<p>Hi ${greeting}, enter this code to sign in:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p>`)
  }
}

export function passwordResetEmail(name: string, resetUrl: string) {
  const greeting = escapeHtml(name)
  const safeUrl = escapeHtml(resetUrl)
  return {
    subject: 'Reset your Structura password',
    text: `Hi ${name}, reset your password using this link: ${resetUrl}. The link expires in 30 minutes.`,
    html: emailLayout('Reset your password', `<p>Hi ${greeting}, use the link below to choose a new password. It expires in 30 minutes.</p><p><a href="${safeUrl}" style="display:inline-block;background:#3157d5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px">Reset password</a></p>`)
  }
}

export function workspaceInvitationEmail(
  inviterName: string,
  workspaceName: string,
  acceptanceUrl: string
) {
  const greeting = escapeHtml(inviterName)
  const safeWorkspace = escapeHtml(workspaceName)
  const safeUrl = escapeHtml(acceptanceUrl)
  return {
    subject: `Invitation to join ${workspaceName} on Structura`,
    text: `${inviterName} invited you to join the ${workspaceName} workspace on Structura. Sign in or create a verified account with this email address, then accept the invitation: ${acceptanceUrl}. The invitation expires in 7 days.`,
    html: emailLayout(
      'You have a workspace invitation',
      `<p>${greeting} invited you to join the <strong>${safeWorkspace}</strong> workspace.</p><p>Sign in or create a verified Structura account using this email address, then accept the invitation.</p><p><a href="${safeUrl}" style="display:inline-block;background:#3157d5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`
    )
  }
}

export async function sendAuthEmail(to: string, template: { subject: string; text: string; html: string }) {
  await transport.sendMail({
    from: config.mail.from,
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  })
}
