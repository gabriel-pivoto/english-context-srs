import nodemailer, { type Transporter } from "nodemailer";

type MagicLinkPayload = {
  to: string;
  magicLink: string;
  token: string;
};

export type DevMagicLinkSnapshot = {
  to: string;
  token: string;
  magicLink: string;
  sentAt: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEV_FALLBACK_ALLOWED =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_EMAIL_FALLBACK === "1";

let cachedTransporter: Transporter | null = null;
let lastDevMagicLink: DevMagicLinkSnapshot | null = null;

function snapshotMagicLink(payload: MagicLinkPayload) {
  if (process.env.NODE_ENV !== "production") {
    lastDevMagicLink = {
      ...payload,
      sentAt: new Date().toISOString(),
    };
    console.info(`[auth] Magic link for ${payload.to}: ${payload.magicLink}`);
  }
}

function getTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (process.env.SMTP_URL) {
    cachedTransporter = nodemailer.createTransport(process.env.SMTP_URL);
  } else if (DEV_FALLBACK_ALLOWED) {
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
  } else {
    throw new Error(
      "SMTP_URL or RESEND_API_KEY must be configured to send emails in production. Set ALLOW_DEV_EMAIL_FALLBACK=1 to override (not recommended).",
    );
  }

  return cachedTransporter;
}

async function sendViaResend({ to, magicLink }: MagicLinkPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.MAIL_FROM ?? "no-reply@example.com";
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your English Context SRS sign-in link",
      html: renderHtmlBody(magicLink),
      text: renderTextBody(magicLink),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend API error: ${message || response.statusText}`);
  }
}

const renderTextBody = (magicLink: string) => `Click the link below to finish signing in (expires in 15 minutes):

${magicLink}

If you did not request this, you can ignore this email.`;

const renderHtmlBody = (magicLink: string) => `<p>Click the button below to finish signing in. This link expires in 15 minutes.</p>
<p><a href="${magicLink}" style="display:inline-block;padding:8px 16px;background-color:#111827;color:#f9fafb;border-radius:6px;text-decoration:none;font-weight:600;">Sign in</a></p>
<p>If the button does not work, copy and paste this link into your browser:<br /><code>${magicLink}</code></p>
<p>If you did not request this, you can ignore this email.</p>`;

export async function sendMagicLinkEmail(payload: MagicLinkPayload) {
  const { to, magicLink } = payload;
  const from = process.env.MAIL_FROM ?? "no-reply@example.com";

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(payload);
    snapshotMagicLink(payload);
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    to,
    from,
    subject: "Your English Context SRS sign-in link",
    text: renderTextBody(magicLink),
    html: renderHtmlBody(magicLink),
  });

  snapshotMagicLink(payload);
}

export function getLastMagicLinkForDev() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_EMAIL_FALLBACK !== "1") {
    return null;
  }
  return lastDevMagicLink;
}
