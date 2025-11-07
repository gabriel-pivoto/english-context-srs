import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../lib/db";
import { sendMagicLinkEmail } from "../../../../lib/mailer";
import { hashToken } from "../../../../lib/token";

const RequestSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email."),
});

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_MS = 60 * 1000;

const cleanupExpiredTokens = () => {
  return prisma.emailToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

const getClientIp = (request: NextRequest) =>
  request.ip ??
  request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(0) ??
  null;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimitBoundary = new Date(Date.now() - RATE_LIMIT_MS);
  const clientIp = getClientIp(request);

  await cleanupExpiredTokens();

  const recentToken = await prisma.emailToken.findFirst({
    where: {
      email,
      createdAt: { gte: rateLimitBoundary },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentToken) {
    return NextResponse.json(
      { error: "Please wait a minute before requesting another link." },
      { status: 429 },
    );
  }

  if (clientIp) {
    const recentIpToken = await prisma.emailToken.findFirst({
      where: {
        requestIp: clientIp,
        createdAt: { gte: rateLimitBoundary },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentIpToken) {
      return NextResponse.json(
        { error: "Too many requests from this IP. Please try again shortly." },
        { status: 429 },
      );
    }
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
      requestIp: clientIp,
    },
  });

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3005").replace(/\/$/, "");
  const magicLink = `${baseUrl}/api/auth/callback?token=${token}`;

  try {
    await sendMagicLinkEmail({ to: email, magicLink, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
