import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'ACLPIT Admin <onboarding@resend.dev>';
}

/** Base URL used to build links inside emails. */
export function getAppUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends an email via Resend. Never throws.
 *
 * When RESEND_API_KEY is unset (local dev), the email is logged to the server
 * console instead — including any action link — so invite and password-reset
 * flows remain testable without configuring a mail provider.
 */
async function sendEmail(to: string, subject: string, html: string, devLink?: string): Promise<SendResult> {
  const resend = getResend();

  if (!resend) {
    console.warn(
      `\n📧 [dev] RESEND_API_KEY not set — email not sent.\n   To: ${to}\n   Subject: ${subject}` +
        (devLink ? `\n   Link: ${devLink}` : '') +
        '\n'
    );
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({ from: getFromAddress(), to, subject, html });
    if (error) {
      console.error('Resend error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

const WINE = '#5E0E3A';

function layout(heading: string, body: string, cta?: { label: string; url: string }): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF6EF;font-family:Arial,Helvetica,sans-serif;color:#241521;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${WINE};border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:${WINE};padding:24px 32px;">
                <div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.16em;">ACLPIT</div>
                <div style="color:#DCCFBB;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px;">Admin Panel</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;color:#241521;">${heading}</h1>
                <div style="font-size:15px;line-height:1.7;color:#6B5A64;">${body}</div>
                ${
                  cta
                    ? `<div style="margin:28px 0 8px;">
                         <a href="${cta.url}" style="display:inline-block;background:${WINE};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;padding:14px 28px;border-radius:999px;">${cta.label}</a>
                       </div>
                       <p style="font-size:12px;color:#6B5A64;margin-top:16px;word-break:break-all;">
                         If the button does not work, copy this link into your browser:<br>
                         <a href="${cta.url}" style="color:${WINE};">${cta.url}</a>
                       </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #EFE5D6;font-size:12px;color:#6B5A64;">
                African Centre for Law and Public Interest Technology
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  role: string;
  token: string;
}): Promise<SendResult> {
  const url = `${getAppUrl()}/auth/accept-invite?token=${params.token}`;
  const roleLabel = params.role.replace('_', ' ');
  const html = layout(
    'You have been invited',
    `<p><strong>${escapeHtml(params.inviterName)}</strong> has invited you to join the ACLPIT admin panel as
     <strong>${escapeHtml(roleLabel)}</strong>.</p>
     <p>Click the button below to choose a username and password and activate your account.
     This invitation expires in 7 days.</p>`,
    { label: 'Accept Invitation', url }
  );
  return sendEmail(params.to, 'You have been invited to the ACLPIT admin panel', html, url);
}

export async function sendPasswordResetEmail(params: { to: string; token: string }): Promise<SendResult> {
  const url = `${getAppUrl()}/auth/reset-password?token=${params.token}`;
  const html = layout(
    'Reset your password',
    `<p>We received a request to reset the password for your ACLPIT admin account.</p>
     <p>Click the button below to choose a new password. This link expires in 1 hour and can only be used once.</p>
     <p>If you did not request this, you can safely ignore this email — your password will not change.</p>`,
    { label: 'Reset Password', url }
  );
  return sendEmail(params.to, 'Reset your ACLPIT admin password', html, url);
}

export async function sendWelcomeEmail(params: { to: string; displayName: string }): Promise<SendResult> {
  const url = `${getAppUrl()}/auth`;
  const html = layout(
    'Your account is ready',
    `<p>Hello ${escapeHtml(params.displayName)},</p>
     <p>Your ACLPIT admin account has been created and is ready to use. You can sign in with your
     email address or username and the password you chose.</p>`,
    { label: 'Go to Admin Panel', url }
  );
  return sendEmail(params.to, 'Your ACLPIT admin account is ready', html, url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
