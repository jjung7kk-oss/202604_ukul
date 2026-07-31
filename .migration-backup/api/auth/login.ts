import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  signSessionToken,
  verifyCredentials,
} from '../../lib/adminAuth.js'

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function parseBody(
  req: VercelRequest,
): Record<string, unknown> | null {
  if (req.body == null) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (typeof req.body === 'object') {
    return req.body as Record<string, unknown>
  }
  return null
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = parseBody(req)
  const username =
    typeof body?.username === 'string' ? body.username : undefined
  const password =
    typeof body?.password === 'string' ? body.password : undefined
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' })
    return
  }

  if (!verifyCredentials(username, password)) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = signSessionToken()
  res.status(200).json({ token })
}
