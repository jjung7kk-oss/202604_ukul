import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifySessionToken } from '../../shared/adminAuth.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  // GET: 전체 코드 타입 목록 (공개)
  if (req.method === 'GET') {
    try {
      const { getChordTypes } = await import('../../shared/chordService.js')
      const types = await getChordTypes()
      res.status(200).json(types)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Failed to load chord types' })
    }
    return
  }

  // POST: 새 코드 타입 등록 (관리자 전용)
  if (req.method === 'POST') {
    const token = getBearerToken(req.headers.authorization)
    if (!verifySessionToken(token)) { res.status(401).json({ error: 'Unauthorized' }); return }

    const body = parseBody(req)
    const key = (typeof body?.key === 'string' ? body.key : '').trim()
    if (!key) { res.status(400).json({ error: 'key 필드가 필요합니다.' }); return }
    if (!/^[^\s,;]{1,32}$/.test(key)) {
      res.status(400).json({ error: 'key는 공백/쉼표/세미콜론 없이 32자 이하여야 합니다.' }); return
    }

    const label = (typeof body?.label === 'string' ? body.label : key).trim()
    const orderIndex = typeof body?.orderIndex === 'number' ? body.orderIndex : 999
    const aliases = Array.isArray(body?.aliases)
      ? (body.aliases as unknown[]).map((a) => String(a).trim()).filter(Boolean)
      : []

    try {
      const { createChordType } = await import('../../shared/chordService.js')
      const created = await createChordType(key, label, orderIndex, aliases)
      res.status(201).json(created)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('Unique constraint')) {
        res.status(409).json({ error: `'${key}' 코드 타입이 이미 존재합니다.` })
      } else {
        console.error(e)
        res.status(500).json({ error: '저장에 실패했습니다.' })
      }
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
