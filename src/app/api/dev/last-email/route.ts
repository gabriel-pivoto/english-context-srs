import { NextResponse } from "next/server";
import { getLastMagicLinkForDev } from "../../../../lib/mailer";

export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_EMAIL_FALLBACK !== "1") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const lastEmail = getLastMagicLinkForDev();
  if (!lastEmail) {
    return NextResponse.json({ error: "No magic links sent yet." }, { status: 404 });
  }

  return NextResponse.json(lastEmail);
}
