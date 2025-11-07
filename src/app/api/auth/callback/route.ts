import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/db";
import { createSessionToken, setSessionCookie } from "../../../../lib/auth";
import { hashToken } from "../../../../lib/token";

const REDIRECT_SUCCESS = "/study";

function redirectWithError(request: NextRequest, reason: string) {
  const url = new URL("/login", request.nextUrl);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return redirectWithError(request, "missing");
  }

  const tokenHash = hashToken(token);
  const record = await prisma.emailToken.findUnique({ where: { tokenHash } });
  if (!record) {
    return redirectWithError(request, "invalid");
  }

  if (record.used) {
    return redirectWithError(request, "used");
  }

  if (record.expiresAt < new Date()) {
    return redirectWithError(request, "expired");
  }

  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: {},
    create: {
      email: record.email,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  await prisma.emailToken.update({
    where: { tokenHash },
    data: { used: true },
  });

  const sessionToken = await createSessionToken({ id: user.id, email: user.email });
  const response = NextResponse.redirect(new URL(REDIRECT_SUCCESS, request.nextUrl));
  setSessionCookie(response, sessionToken);

  return response;
}
