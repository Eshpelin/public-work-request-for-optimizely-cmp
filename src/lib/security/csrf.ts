import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "__csrf";

/**
 * Generates a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sets the CSRF cookie on a NextResponse. The cookie is set with
 * httpOnly=false so that client-side JavaScript can read the value
 * and include it in the X-CSRF-Token header for requests.
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

/**
 * Validates the CSRF token by comparing the value from the __csrf cookie
 * against the value in the X-CSRF-Token request header (double-submit
 * cookie pattern). Returns true if both values exist and match.
 */
export function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get("X-CSRF-Token");

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks.
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}
