import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, getSessionUserId } from '../../shared/adminAuth.js'
import { formatScoreDbError } from '../../shared/scoreDbError.js'
import { ScoreServiceError } from '../../shared/scoreService.js'

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  if (req.method === 'DELETE') {
    const token = getBearerToken(req.headers.authorization)
    const userId = getSessionUserId(token)
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

    const scoreId = typeof req.query.id === 'string' ? req.query.id : ''
    if (!scoreId) { res.status(400).json({ error: 'score id required' }); return }

    try {
      const { deleteScore } = await import('../../shared/scoreService.js')
      await deleteScore(scoreId, userId)
      res.status(200).json({ ok: true })
    } catch (e) {
      if (e instanceof ScoreServiceError) {
        if (e.code === 'NOT_FOUND') { res.status(404).json({ error: e.message }); return }
        if (e.code === 'FORBIDDEN') { res.status(403).json({ error: e.message }); return }
      }
      console.error(e); res.status(500).json({ error: formatScoreDbError(e) })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
