import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET,
  ADMIN_USERNAME,
} from './adminCredentials.js'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function verifyCredentials(username: string, password: string): boolean {
  return (
    timingSafeStringEqual(username, ADMIN_USERNAME) &&
    timingSafeStringEqual(password, ADMIN_PASSWORD)
  )
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url')
}

export function signSessionToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payloadB64 = Buffer.from(
    JSON.stringify({ sub: 'admin', exp }),
    'utf8',
  ).toString('base64url')
  const sig = signPayload(payloadB64)
  return `${payloadB64}.${sig}`
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false
  const dot = token.indexOf('.')
  if (dot < 1) return false
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!sig) return false
  const expected = signPayload(payloadB64)
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return false
    }
  } catch {
    return false
  }
  let parsed: { exp?: number; sub?: string }
  try {
    parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as { exp?: number; sub?: string }
  } catch {
    return false
  }
  if (parsed.sub !== 'admin' || typeof parsed.exp !== 'number') return false
  if (parsed.exp < Date.now()) return false
  return true
}

export function getBearerToken(
  authorization: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization
  if (!raw || typeof raw !== 'string') return null
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim())
  return m ? m[1]! : null
}
