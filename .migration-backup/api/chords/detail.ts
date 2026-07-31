import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifySessionToken } from '../../lib/adminAuth.js'

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  const token = getBearerToken(req.headers.authorization)
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
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

  if (req.method === 'GET') {
    if (!requireAuth(req, res)) return
    const root = String(req.query.root ?? '')
    const type = String(req.query.type ?? '')
    if (!root || !type) {
      res.status(400).json({ error: 'root and type query params required' })
      return
    }
    try {
      const { getChordDetail } = await import('../../lib/chordService.js')
      const detail = await getChordDetail(root, type)
      res.status(200).json(detail)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to load chord' })
    }
    return
  }

  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return
    const body = parseBody(req)
    const root = typeof body?.root === 'string' ? body.root : undefined
    const type = typeof body?.type === 'string' ? body.type : undefined
    const shapes = body?.shapes
    if (!root || !type || !Array.isArray(shapes)) {
      res.status(400).json({ error: 'root, type, shapes[] required' })
      return
    }
    if (shapes.length > 4) {
      res.status(400).json({ error: 'At most 4 shapes' })
      return
    }
    const normalized: { frets: [number, number, number, number] }[] = []
    for (const s of shapes) {
      if (!s || typeof s !== 'object' || !('frets' in s)) {
        res.status(400).json({ error: 'Invalid frets in shapes' })
        return
      }
      const frets = (s as { frets: unknown }).frets
      if (
        !Array.isArray(frets) ||
        frets.length !== 4 ||
        frets.some((n) => typeof n !== 'number' || n < 0 || n > 15)
      ) {
        res.status(400).json({ error: 'Invalid frets in shapes' })
        return
      }
      normalized.push({
        frets: [frets[0], frets[1], frets[2], frets[3]] as [
          number,
          number,
          number,
          number,
        ],
      })
    }
    try {
      const { replaceChordShapes } = await import('../../lib/chordService.js')
      await replaceChordShapes(root, type, normalized)
      res.status(200).json({ ok: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to save' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
