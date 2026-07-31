import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim().length === 0) {
    throw new Error(
      `Required environment variable ${key} is missing or empty. ` +
        `Set it as a Replit Secret before starting the server.`,
    );
  }
  return val;
}

// Eagerly validate at module load time so the server crashes loudly on startup
// instead of silently allowing insecure fallbacks.
const ADMIN_USERNAME = requireEnv("ADMIN_USERNAME");
const ADMIN_PASSWORD = requireEnv("ADMIN_PASSWORD");
const ADMIN_SESSION_SECRET = requireEnv("SESSION_SECRET");

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyCredentials(username: string, password: string): boolean {
  return (
    timingSafeStringEqual(username, ADMIN_USERNAME) &&
    timingSafeStringEqual(password, ADMIN_PASSWORD)
  );
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

export function signSessionToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({ sub: "admin", exp }),
    "utf8",
  ).toString("base64url");
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

function parseSessionTokenPayload(
  token: string | null | undefined,
): { exp: number; sub: string } | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!sig) return null;
  const expected = signPayload(payloadB64);
  try {
    if (
      !timingSafeEqual(
        Buffer.from(sig, "utf8"),
        Buffer.from(expected, "utf8"),
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }
  let parsed: { exp?: number; sub?: string };
  try {
    parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { exp?: number; sub?: string };
  } catch {
    return null;
  }
  if (parsed.sub !== "admin" || typeof parsed.exp !== "number") return null;
  if (parsed.exp < Date.now()) return null;
  return { sub: parsed.sub, exp: parsed.exp };
}

export function verifySessionToken(token: string | null | undefined): boolean {
  return parseSessionTokenPayload(token) != null;
}

export function getSessionUserId(token: string | null | undefined): string | null {
  return parseSessionTokenPayload(token)?.sub ?? null;
}

export function getBearerToken(
  authorization: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!raw || typeof raw !== "string") return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return m ? m[1]! : null;
}

export function extractBearerFromReq(req: Request): string | null {
  return getBearerToken(req.headers.authorization);
}
