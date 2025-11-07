import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_API_PATHS = [/^\/api\/auth/, /^\/api\/health/, /^\/api\/dev\//];
const SESSION_COOKIE = "session";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET must be set for middleware verification.");
}
const secretBytes = new TextEncoder().encode(jwtSecret);

async function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, secretBytes, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_PATHS.some((regex) => regex.test(pathname))) {
    return NextResponse.next();
  }

  const ok = await isAuthenticated(request);
  if (!ok) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
