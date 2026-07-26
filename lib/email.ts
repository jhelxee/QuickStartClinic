import "server-only";

/**
 * Minimal wrapper around Resend's REST API — a single POST, so pulling in an
 * SDK dependency for it isn't worth it.
 *
 * Deliberately never throws. Email is a courtesy on top of something that has
 * already succeeded in the database (a booking, an inquiry) — a flaky email
 * provider should never be the reason that save fails or a Server Action
 * returns an error the user didn't cause.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

// Resend's own shared test sender — works without verifying a domain, but
// check your Resend dashboard for the current delivery limits on an
// unverified account. Once you verify a domain there, set RESEND_FROM_EMAIL
// to an address on it (e.g. "QuickStart Clinic <no-reply@yourdomain.com>").
const DEFAULT_FROM = "QuickStart Clinic <onboarding@resend.dev>";

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // Not configured yet. Log once so it's discoverable in the server console,
  // but never block whatever already happened in the database.
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY is not set — skipped "${options.subject}" to ${options.to}.`
    );
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend rejected "${options.subject}": ${response.status} ${body}`);
    }
  } catch (error) {
    console.error(`[email] Failed to send "${options.subject}":`, error);
  }
}

/**
 * Shared branded chrome around a plain-language message. Email clients don't
 * run Tailwind, so this is hand-written inline-styled HTML rather than the
 * className system the rest of the app uses.
 */
export function emailShell(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f9fb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0b2a4a;padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:600;">QuickStart Clinic</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#0b2a4a;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
