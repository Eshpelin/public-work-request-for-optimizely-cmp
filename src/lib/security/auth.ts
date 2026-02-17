import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = "24h";
const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

const tokenBlocklist = new Set<string>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifyToken(token: string): JwtPayload {
  if (tokenBlocklist.has(token)) {
    throw new Error("Token has been revoked");
  }
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function revokeToken(token: string): void {
  tokenBlocklist.add(token);
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
