import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, getSessionUserId } from '../../shared/adminAuth.js'
import { formatScoreDbError } from '../../shared/scoreDbError.js'
import { ScoreServiceError } from '../../shared/scoreService.js'

function logRouteError(route: string, e: unknown): void {
  if (e instanceof Error) { console.error(`[${route}]`, e.message, e.stack); return }
  console.error(`[${route}]`, e)
}

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function parseBody(req: VercelRequest): Record<string, unknown> | null {
  if (req.body == null) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) as Record<string, unknown> } catch { return null }
  }
  if (typeof req.body === 'object') return req.body as Record<string, unknown>
  return null
}

function requireUserId(req: VercelRequest, res: VercelResponse): string | null {
  const token = getBearerToken(req.headers.authorization)
  const userId = getSessionUserId(token)
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null }
  return userId
}

function mapScore(score: {
  id: string; title: string; artist: string; sharedChordText: string; notation: unknown
  createdAt: Date; updatedAt: Date
  verses: { id: string; orderIndex: number; label: string; lyrics: string }[]
}) {
  return {
    id: score.id, title: score.title, artist: score.artist,
    sharedChordText: score.sharedChordText, notation: score.notation,
    createdAt: score.createdAt.toISOString(), updatedAt: score.updatedAt.toISOString(),
    verses: score.verses.map((v) => ({ id: v.id, orderIndex: v.orderIndex, label: v.label, lyrics: v.lyrics })),
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  if (req.method === 'GET') {
    const userId = requireUserId(req, res)
    if (!userId) return
    try {
      const { listScoresByUser } = await import('../../shared/scoreService.js')
      const scores = await listScoresByUser(userId)
      res.status(200).json({ scores: scores.map(mapScore) })
    } catch (e) { logRouteError('GET /api/scores', e); res.status(500).json({ error: formatScoreDbError(e) }) }
    return
  }

  if (req.method === 'POST') {
    const userId = requireUserId(req, res)
    if (!userId) return
    const body = parseBody(req)
    const rawScoreId = body?.scoreId
    const scoreId = typeof rawScoreId === 'string' && rawScoreId.trim().length > 0 ? rawScoreId.trim() : undefined
    const title = typeof body?.title === 'string' ? body.title : ''
    const artist = typeof body?.artist === 'string' ? body.artist : ''
    const sharedChordText = typeof body?.sharedChordText === 'string' ? body.sharedChordText : ''
    const rawVerses = Array.isArray(body?.verses) ? body.verses : []
    const verses = (rawVerses as unknown[])
      .map((verse, index) => {
        if (!verse || typeof verse !== 'object') return null
        const v = verse as { label?: unknown; lyrics?: unknown }
        return { label: typeof v.label === 'string' ? v.label : `${index + 1}절`, lyrics: typeof v.lyrics === 'string' ? v.lyrics : '' }
      })
      .filter((v): v is { label: string; lyrics: string } => v != null)
    try {
      const { saveScore } = await import('../../shared/scoreService.js')
      const score = await saveScore({ scoreId, userId, title, artist, sharedChordText, notation: body?.notation, verses })
      res.status(200).json({ score: mapScore(score) })
    } catch (e) {
      if (e instanceof ScoreServiceError) {
        if (e.code === 'BAD_REQUEST') { res.status(400).json({ error: e.message }); return }
        if (e.code === 'NOT_FOUND') { res.status(404).json({ error: e.message }); return }
        if (e.code === 'FORBIDDEN') { res.status(403).json({ error: e.message }); return }
      }
      logRouteError('POST /api/scores', e); res.status(500).json({ error: formatScoreDbError(e) })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
