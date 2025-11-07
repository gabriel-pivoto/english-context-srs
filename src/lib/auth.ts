import type { Profile, User } from "@prisma/client";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "./db";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "session";

type SessionPayload = JWTPayload & {
  sub: string;
  email: string;
};

export type SessionUser = User & { profile: Profile | null };

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: { id: string; email: string }) {
  return new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ONE_WEEK_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const result = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
  const { payload } = result;
  if (!payload?.sub || !payload?.email) {
    throw new Error("Invalid session payload.");
  }
  return payload as SessionPayload;
}

export function setSessionCookie(response: NextResponse, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

async function getUserByToken(token: string): Promise<SessionUser | null> {
  try {
    const payload = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function getUserFromCookies(): Promise<SessionUser | null> {
  const cookieValue = cookies().get(SESSION_COOKIE)?.value;
  if (!cookieValue) {
    return null;
  }
  return getUserByToken(cookieValue);
}

export async function getUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return getUserByToken(token);
}

type AuthedRouteHandler<Params> = (
  request: NextRequest,
  context: { params: Params },
  user: SessionUser,
) => Promise<Response>;

export function requireUser<Params = Record<string, string>>(
  handler: AuthedRouteHandler<Params>,
) {
  return async (request: NextRequest, context: { params: Params }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, user);
  };
}
